import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// --- 重要: デプロイしたCHHClaimVaultのアドレスに変更してください ---
const TOKEN_CONTRACT_ADDRESS = "0xAdE397b3373eC0245e261F5a6CCd7D439DA66e1a"; 

const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// ABI matching the CHHClaimVault contract
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

/**
 * Fetches the daily claim count for the user.
 * Uses public RPC to avoid network mismatch errors with wallet.
 */
export const fetchDailyClaimCount = async (walletAddress: string): Promise<number> => {
  try {
    // Use public RPC for read-only operations
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, provider);
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

    // Extract signature AND the adjusted score (which is now in Wei units: score * 10^18)
    const { signature, adjusted_score } = data;
    
    if (!adjusted_score) {
        throw new Error("Backend did not return adjusted score.");
    }

    // 2. Prepare Wallet Provider & Switch Network Logic
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

    // --- Network Switching Logic (Perform BEFORE creating BrowserProvider) ---
    // We use the raw request method to ensure the underlying provider is on the right chain.
    try {
        const currentChainId = await windowProvider.request({ method: 'eth_chainId' });
        
        if (currentChainId !== BASE_CHAIN_ID_HEX && Number(currentChainId) !== BASE_CHAIN_ID_DEC) {
            try {
                await windowProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_CHAIN_ID_HEX }],
                });
            } catch (switchError: any) {
                // This error code 4902 indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902 || switchError.code === '4902' || switchError.message?.includes("Unrecognized chain")) {
                    await windowProvider.request({
                        method: 'wallet_addEthereumChain',
                        params: [
                            {
                                chainId: BASE_CHAIN_ID_HEX,
                                chainName: 'Base',
                                rpcUrls: ['https://mainnet.base.org'],
                                nativeCurrency: {
                                    name: 'Ether',
                                    symbol: 'ETH',
                                    decimals: 18
                                },
                                blockExplorerUrls: ['https://basescan.org']
                            },
                        ],
                    });
                } else {
                    throw switchError;
                }
            }
        }
    } catch (networkError: any) {
        console.error("Network switch error:", networkError);
        throw new Error("Failed to switch network to Base. Please switch manually.");
    }

    // 3. Initialize Provider AFTER Network Switch
    // This ensures Ethers picks up the correct Chain ID immediately.
    const provider = new ethers.BrowserProvider(windowProvider);
    
    // 4. Send Transaction
    console.log("Sending claimScore transaction on Base...", { 
      originalScore: score,
      adjustedScore: adjusted_score, 
      signature, 
      target: TOKEN_CONTRACT_ADDRESS 
    });

    const signer = await provider.getSigner(walletAddress);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // Call claimScore with the ADJUSTED SCORE (in Wei) returned from PHP
    // Ethers handles string inputs for large integers automatically
    const tx = await contract.claimScore(adjusted_score, signature, {
        gasLimit: 300000 // Set a safe upper bound for gas
    });
    
    console.log("Transaction successfully requested:", tx.hash);

    return {
      success: true,
      message: "Transaction sent! Please confirm in your wallet.",
      txHash: tx.hash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error Full Object:", error);

    const errMsg = error.message || "";
    
    if (error.code === 'NETWORK_ERROR') {
        return { 
          success: false, 
          message: `Network error. Please ensure your wallet is connected to Base.` 
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
        // Since we added gasLimit, this error might now contain data, or it might be a simulation failure.
        return { 
          success: false, 
          message: `Contract call failed. Please check if you have already claimed today or if the vault is empty.` 
        };
    }

    return {
      success: false,
      message: `Error: ${error.message || errMsg}`
    };
  }
};