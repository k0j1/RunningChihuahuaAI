import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// --- 重要: デプロイしたCHHClaimVaultのアドレスに変更してください ---
const TOKEN_CONTRACT_ADDRESS = "0xb0525542E3D818460546332e76E511562dFf9B07"; 

const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// ABI matching the CHHClaimVault contract
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

/**
 * Fetches the daily claim count for the user.
 * (Optional display logic, currently just returns 0 to satisfy interface if needed)
 */
export const fetchDailyClaimCount = async (walletAddress: string): Promise<number> => {
  try {
    let windowProvider: any; 
    if (sdk.wallet.ethProvider) {
       windowProvider = sdk.wallet.ethProvider;
    } else if (window.ethereum) {
       windowProvider = window.ethereum;
    } else {
       return 0;
    }

    const provider = new ethers.BrowserProvider(windowProvider, {
        chainId: BASE_CHAIN_ID_DEC,
        name: 'base'
    });

    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, provider);
    // userClaims returns a struct/array: [lastClaimDay, dailyCount]
    const info = await contract.userClaims(walletAddress);
    return Number(info[1]); // Return dailyCount
  } catch (error) {
    console.error("Error fetching claim count:", error);
    return 0;
  }
};

export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    console.log(`Preparing claim for Score=${score}`);

    // Validation based on contract constraint
    if (score > 60000) {
        throw new Error("Invalid score: Exceeds maximum limit of 60,000.");
    }

    // 1. Request Signature from Backend (PHP API)
    const apiUrl = './api/claim.php'; 

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, score: score }) // Send current run score
    });

    // Safely parse response, handling potential 400 errors containing JSON messages
    const text = await response.text();
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        // If not JSON, use text as error message if response is bad
        if (!response.ok) throw new Error(text || `HTTP Error ${response.status}`);
    }

    if (!response.ok) {
        // Throw the message from JSON if available, otherwise generic
        throw new Error((data && data.message) || text || `Server error: ${response.status}`);
    }

    if (!data || !data.success || !data.signature) {
      throw new Error((data && data.message) || 'Failed to generate signature from backend');
    }

    const { signature } = data;

    // 2. Prepare Wallet Provider
    let windowProvider: any; 

    if (sdk.wallet.ethProvider) {
       windowProvider = sdk.wallet.ethProvider;
    } else if (window.ethereum) {
       windowProvider = window.ethereum;
    } else {
       throw new Error("No crypto wallet found. Please use a Web3 browser or Warpcast.");
    }

    if (sdk.actions.ready) {
      await sdk.actions.ready();
    }

    const provider = new ethers.BrowserProvider(windowProvider, {
        chainId: BASE_CHAIN_ID_DEC,
        name: 'base'
    });

    // 3. Send Transaction
    console.log("Sending claimScore transaction on Base...", { 
      score, 
      signature, 
      target: TOKEN_CONTRACT_ADDRESS 
    });

    const signer = await provider.getSigner(walletAddress);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // Call claimScore with the CURRENT RUN SCORE (Contract logic changed)
    const tx = await contract.claimScore(score, signature);
    
    console.log("Transaction successfully requested:", tx.hash);

    return {
      success: true,
      message: "Transaction sent! Please confirm in your wallet.",
      txHash: tx.hash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error Full Object:", error);

    const errorDetails = [
      error.message || "No error message",
      error.reason ? `Reason: ${error.reason}` : null,
      error.revert?.args ? `RevertArgs: ${error.revert.args}` : null,
      `Addr: ${walletAddress}`,
      `Score: ${score}`
    ].filter(Boolean).join(" | ");

    const errMsg = error.message || "";
    
    if (error.code === 'NETWORK_ERROR') {
        return { 
          success: false, 
          message: `Network error. Ensure wallet is on Base. (${error.code})` 
        };
    }

    if (error.code === 4001 || error.code === 'ACTION_REJECTED' || errMsg.includes('rejected')) {
        return { success: false, message: "Transaction rejected by user." };
    }
    
    // Contract specific errors
    if (errMsg.includes('Daily claim limit reached')) {
         return { success: false, message: "Daily claim limit reached (10 times/day)." };
    }
    if (errMsg.includes('Invalid signature')) {
         return { success: false, message: "Security check failed (Invalid Signature)." };
    }
    if (errMsg.includes('Not enough tokens in vault')) {
         return { success: false, message: "The prize vault is currently empty." };
    }

    if (error.code === 'CALL_EXCEPTION') {
        return { 
          success: false, 
          message: `Contract call failed. Reason: ${error.reason || 'Unknown'}` 
        };
    }

    return {
      success: false,
      message: `Error: ${error.message || errMsg}`
    };
  }
};