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
    let provider: ethers.BrowserProvider;
    let windowProvider: any; 

    if (sdk.wallet.ethProvider) {
       windowProvider = sdk.wallet.ethProvider;
    } else if (window.ethereum) {
       windowProvider = window.ethereum;
    } else {
       throw new Error("No crypto wallet found. Please use a Web3 browser or Warpcast.");
    }

    // Initialize provider for read operations if needed, but we will use windowProvider for sending
    provider = new ethers.BrowserProvider(windowProvider, "any");

    // --- NETWORK SWITCH LOGIC (BASE CHECK) ---
    try {
        let currentChainId = 0;
        try {
            const chainIdHex = await windowProvider.request({ method: 'eth_chainId' });
            currentChainId = parseInt(chainIdHex, 16);
        } catch (rawErr) {
            console.warn("Raw eth_chainId failed, falling back to provider.getNetwork", rawErr);
            const network = await provider.getNetwork();
            currentChainId = Number(network.chainId);
        }
        
        console.log(`Current Chain ID: ${currentChainId}`);

        if (currentChainId !== BASE_CHAIN_ID_DEC) {
            console.log("Switching to Base network...");
            try {
                await windowProvider.request({ 
                    method: "wallet_switchEthereumChain", 
                    params: [{ chainId: BASE_CHAIN_ID_HEX }] 
                });
            } catch (switchError: any) {
                if (switchError.code === 4902 || 
                    switchError.data?.originalError?.code === 4902 ||
                    switchError.message?.includes("Unrecognized chain ID")) {
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
                    throw switchError;
                }
            }
        }
    } catch (networkErr) {
        console.warn("Network switching failed or ignored:", networkErr);
    }
    // ----------------------------------------

    // 3. Send Transaction via raw provider to bypass Ethers.js eth_accounts checks
    // This resolves the 'could not coalesce error' related to eth_accounts in Frame environments
    console.log("Sending transaction on Base (Raw)...", { score, signature });

    const iface = new ethers.Interface(GAME_TOKEN_ABI);
    const dataEncoded = iface.encodeFunctionData("claimScore", [score.toString(), signature]);

    const txHash = await windowProvider.request({
        method: 'eth_sendTransaction',
        params: [{
            from: walletAddress,
            to: TOKEN_CONTRACT_ADDRESS,
            data: dataEncoded,
            // gas: "0x7A120" // Optional: let wallet estimate
        }]
    });

    console.log("Transaction sent:", txHash);

    return {
      success: true,
      message: "Transaction sent! Waiting for confirmation.",
      txHash: txHash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error:", error);
    
    if (error.code === 'ACTION_REJECTED' || error.code === 4001 || (error.message && error.message.includes('User rejected'))) {
        return { success: false, message: "Transaction rejected by user." };
    }
    
    // Check for revert strings in message
    if (error.message?.includes('Already claimed') || error.data?.message?.includes('Already claimed')) {
         return { success: false, message: "You have already claimed this score!" };
    }

    return {
      success: false,
      message: error.reason || error.message || "Unknown error occurred during claim."
    };
  }
};