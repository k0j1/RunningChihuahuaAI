import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// Configuration
const TOKEN_CONTRACT_ADDRESS = "0x8f1319df35b63990053e8471C3F41B0d7067d5B7"; // GameToken Address on Base
const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// ABI matching the Solidity contract provided
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function decimals() view returns (uint8)",
  "function totalClaimed(address) view returns (uint256)"
];

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

    // --- NETWORK SWITCH LOGIC (BASE CHECK) ---
    // We use raw request instead of ethers provider to avoid the 'coalesce error'
    try {
        let chainIdHex = '';
        try {
            chainIdHex = await windowProvider.request({ method: 'eth_chainId' });
        } catch (e) {
            console.warn("Could not fetch chainId, proceeding without switch", e);
        }

        if (chainIdHex && chainIdHex !== BASE_CHAIN_ID_HEX) {
            console.log("Attempting to switch to Base network...");
            try {
                await windowProvider.request({ 
                    method: "wallet_switchEthereumChain", 
                    params: [{ chainId: BASE_CHAIN_ID_HEX }] 
                });
            } catch (switchError: any) {
                // Error 4902: Chain not added
                if (switchError.code === 4902 || 
                    switchError.data?.originalError?.code === 4902 ||
                    (switchError.message && switchError.message.includes("Unrecognized chain ID"))) {
                    console.log("Base network not found, adding it...");
                    await windowProvider.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: BASE_CHAIN_ID_HEX,
                            chainName: 'Base',
                            rpcUrls: ['https://mainnet.base.org'],
                            nativeCurrency: {
                                name: 'Ether',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: ['https://basescan.org']
                        }]
                    });
                } else {
                    console.warn("Switching failed, user may need to switch manually:", switchError);
                }
            }
        }
    } catch (networkErr) {
        console.warn("Network check logic encountered an error:", networkErr);
    }
    // ----------------------------------------

    // 3. Send Transaction via raw provider
    console.log("Sending transaction on Base (Raw)...", { score, signature });

    const iface = new ethers.Interface(GAME_TOKEN_ABI);
    const dataEncoded = iface.encodeFunctionData("claimScore", [score.toString(), signature]);

    // Use eth_sendTransaction directly to bypass any ethers internal checks that trigger eth_accounts
    const txHash = await windowProvider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: walletAddress,
            to: TOKEN_CONTRACT_ADDRESS,
            data: dataEncoded,
            // DO NOT set gas here, let the wallet/frame handle estimation
        }]
    });

    console.log("Transaction successfully requested:", txHash);

    return {
      success: true,
      message: "Transaction sent! Please confirm in your wallet.",
      txHash: txHash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error:", error);
    
    // Improved error matching for different wallet responses
    const errMsg = error.message || "";
    if (error.code === 4001 || errMsg.includes('rejected') || errMsg.includes('denied')) {
        return { success: false, message: "Transaction rejected by user." };
    }
    
    if (errMsg.includes('Already claimed')) {
         return { success: false, message: "You have already claimed this score!" };
    }

    return {
      success: false,
      message: error.reason || errMsg || "Unknown error occurred during claim. Please try again."
    };
  }
};