import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// --- 修正・確認ポイント ---
const TOKEN_CONTRACT_ADDRESS = "0x8f1319df35b63990053e8471C3F41B0d7067d5B7"; 

const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// ABI matching the provided Solidity contract
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function decimals() view returns (uint8)",
  "function totalClaimed(address) view returns (uint256)"
];

/**
 * Fetches the total score already claimed by the user from the contract.
 */
export const fetchTotalClaimed = async (walletAddress: string): Promise<number> => {
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
    }, {
        staticNetwork: true
    });

    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, provider);
    const claimed: bigint = await contract.totalClaimed(walletAddress);
    return Number(claimed);
  } catch (error) {
    console.error("Error fetching totalClaimed:", error);
    return 0;
  }
};

export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    // 1. Request Signature from Backend (PHP API)
    const apiUrl = './api/claim.php'; 

    console.log(`Requesting signature for ${walletAddress} score: ${score}`);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, score })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error: ${errText}`);
    }

    const data = await response.json();

    if (!data.success || !data.signature) {
      throw new Error(data.message || 'Failed to generate signature from backend');
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
    }, {
        staticNetwork: true
    });

    // 3. Send Transaction
    console.log("Sending claimScore transaction on Base...", { 
      score, 
      signature, 
      target: TOKEN_CONTRACT_ADDRESS 
    });

    const signer = await provider.getSigner(walletAddress);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // Call claimScore(uint256 score, bytes signature)
    const tx = await contract.claimScore(score.toString(), signature);
    
    console.log("Transaction successfully requested:", tx.hash);

    return {
      success: true,
      message: "Transaction sent! Please confirm in your wallet.",
      txHash: tx.hash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error:", error);
    
    const errMsg = error.message || "";
    
    if (error.code === 'NETWORK_ERROR') {
        return { 
          success: false, 
          message: "Network error. Please ensure your wallet is on Base." 
        };
    }

    if (error.code === 4001 || error.code === 'ACTION_REJECTED' || errMsg.includes('rejected')) {
        return { success: false, message: "Transaction rejected by user." };
    }
    
    if (errMsg.includes('Already claimed this score')) {
         return { success: false, message: "You have already claimed this score or higher!" };
    }

    if (errMsg.includes('Not enough tokens in vault')) {
         return { success: false, message: "The prize vault is currently empty. Please wait for refill." };
    }

    if (error.code === 'CALL_EXCEPTION') {
        return { 
          success: false, 
          message: "Contract call failed. Check your balance and network." 
        };
    }

    return {
      success: false,
      message: error.reason || errMsg || "Unknown error occurred during claim."
    };
  }
};