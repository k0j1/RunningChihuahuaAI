import { supabase } from './supabase';
import { ClaimResult } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// Configuration
const TOKEN_CONTRACT_ADDRESS = "0x8f1319df35b63990053e8471C3F41B0d7067d5B7"; // GameToken Address

// ABI must match the contract. 
// Assuming claimScore(uint256 score, bytes calldata signature)
const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function decimals() view returns (uint8)"
];

export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    // 1. Request Signature from Backend (PHP API)
    // The backend signs (walletAddress + score) so the contract can verify the user earned this score.
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

    // 2. Prepare Wallet Provider (User pays gas)
    let provider: ethers.BrowserProvider;

    if (sdk.wallet.ethProvider) {
       provider = new ethers.BrowserProvider(sdk.wallet.ethProvider as any);
    } else if (window.ethereum) {
       provider = new ethers.BrowserProvider(window.ethereum);
    } else {
       throw new Error("No crypto wallet found. Please use a Web3 browser or Warpcast.");
    }

    const signer = await provider.getSigner();
    
    // Verify the signer address matches the one we signed for
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error("Wallet address mismatch. Please use the connected wallet.");
    }

    // 3. Instantiate Contract
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // 4. Send Transaction
    console.log("Sending transaction...", { score, signature });
    
    // Set explicit gasLimit to avoid 'execution reverted' during estimation if conditions aren't perfectly met during simulation.
    // The user pays this gas.
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