import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// Configuration
const TOKEN_CONTRACT_ADDRESS = "0x8f1319df35b63990053e8471C3F41B0d7067d5B7"; // GameToken Address on Base
const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// ABI must match the contract. 
// Assuming claimScore(uint256 score, bytes calldata signature)
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function decimals() view returns (uint8)"
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

    // Use "any" network to handle wallet network switches gracefully and avoid initial strict checks
    // This fixes the 'could not coalesce error' in some frame environments
    provider = new ethers.BrowserProvider(windowProvider, "any");

    // --- NETWORK SWITCH LOGIC (BASE CHECK) ---
    try {
        // Attempt to get Chain ID directly via EIP-1193 request first to bypass potential Ethers parsing issues
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
                // This error code indicates that the chain has not been added to the wallet.
                // 4902 is standard, but check for other indicators too
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
            // Re-sync provider just in case
            provider = new ethers.BrowserProvider(windowProvider, "any");
        }
    } catch (networkErr) {
        console.warn("Network switching failed or ignored:", networkErr);
    }
    // ----------------------------------------

    // Pass walletAddress to getSigner to avoid implicit eth_accounts call which causes errors in some environments
    let signer;
    try {
        signer = await provider.getSigner(walletAddress);
    } catch (e) {
        console.warn("Could not get signer with address, falling back to default signer", e);
        signer = await provider.getSigner();
    }
    
    // Verify the signer address matches the one we signed for
    // This might trigger an internal call, but it's necessary safety
    try {
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            throw new Error("Wallet address mismatch. Please use the connected wallet.");
        }
    } catch (addrErr) {
        console.warn("Could not verify signer address (likely fine if transaction proceeds):", addrErr);
    }

    // 3. Instantiate Contract
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // 4. Send Transaction
    console.log("Sending transaction on Base...", { score, signature });
    
    // Set explicit gasLimit to avoid 'execution reverted' during estimation if conditions aren't perfectly met.
    const tx = await contract.claimScore(score.toString(), signature, {
        gasLimit: 500000 
    });

    console.log("Transaction sent:", tx.hash);

    return {
      success: true,
      message: "Transaction sent! Waiting for confirmation.",
      txHash: tx.hash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error:", error);
    
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        return { success: false, message: "Transaction rejected by user." };
    }
    
    if (error.code === 'CALL_EXCEPTION' || error.message?.includes('reverted')) {
         return { success: false, message: "Transaction failed (Reverted). You may have already claimed this score or the signature is invalid." };
    }

    return {
      success: false,
      message: error.reason || error.message || "Unknown error occurred during claim."
    };
  }
};