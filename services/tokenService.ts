import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// Configuration
const TOKEN_CONTRACT_ADDRESS = "0x8f1319df35b63990053e8471C3F41B0d7067d5B7"; // GameToken Address

// Updated ABI to match the GameToken contract with claimScore
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function decimals() view returns (uint8)"
];

export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    // 1. Request Signature from Backend (PHP API)
    // The backend validates the score and signs (walletAddress + score) with the admin private key.
    
    // Determine API URL (Relative path works if served from same domain, otherwise configure full URL)
    const apiUrl = './api/claim.php'; 

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
      throw new Error(data.message || 'Failed to generate signature');
    }

    const { signature } = data;

    // 2. Prepare Wallet Provider
    // Try to use Farcaster Frame SDK provider first, then fallback to window.ethereum
    let provider: ethers.BrowserProvider;

    if (sdk.wallet.ethProvider) {
       provider = new ethers.BrowserProvider(sdk.wallet.ethProvider as any);
    } else if (window.ethereum) {
       provider = new ethers.BrowserProvider(window.ethereum);
    } else {
       throw new Error("No crypto wallet found. Please use a Web3 browser or Warpcast.");
    }

    // Get the signer (the user)
    const signer = await provider.getSigner();
    
    // Verify the signer address matches the one we signed for (sanity check)
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Wallet address mismatch. Please use the connected wallet.");
    }

    // 3. Instantiate Contract
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // 4. Send Transaction (User pays gas)
    console.log("Sending transaction to contract...", { score, signature });
    
    // Fix: Pass score as string to safely handle uint256
    // Fix: Increase gasLimit to 500,000 to safely bypass strict node estimation checks which cause 'execution reverted'.
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
    
    // Handle user rejection
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        return { success: false, message: "Transaction rejected by user." };
    }
    
    // Handle execution reverted
    if (error.code === 'CALL_EXCEPTION' || error.message?.includes('reverted')) {
         return { success: false, message: "Transaction failed (Reverted). The signature may be invalid or you may have already claimed." };
    }

    return {
      success: false,
      message: error.reason || error.message || "Unknown error occurred during claim."
    };
  }
};