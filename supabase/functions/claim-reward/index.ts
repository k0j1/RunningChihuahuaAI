import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ethers } from 'https://esm.sh/ethers@6.7.0'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration
const TOKEN_CONTRACT_ADDRESS = "0x8f1319df35b63990053e8471C3F41B0d7067d5B7"; // $CHH Contract
const TOKEN_DECIMALS = 18; // Assuming 18 decimals. Adjust if different.

// Minimal ERC20 ABI to execute transfer
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { walletAddress, score } = await req.json()

    if (!walletAddress || !score) {
      throw new Error('Missing walletAddress or score')
    }

    // --- SECURITY & VALIDATION ---
    // In production: Verify score integrity via DB check or signature verification.
    
    // Calculate Reward Amount (e.g., 10% of score)
    // Example: 1000 score = 100 CHH
    const rewardAmount = Math.floor(score * 0.1);

    if (rewardAmount <= 0) {
        throw new Error('Score too low for reward');
    }

    // --- BLOCKCHAIN INTERACTION ---
    
    const rpcUrl = Deno.env.get('RPC_URL');
    const privateKey = Deno.env.get('PRIVATE_KEY');

    if (!rpcUrl || !privateKey) {
      console.error("Missing RPC_URL or PRIVATE_KEY in environment variables.");
      // Fallback for development/demo if keys aren't set (simulated success)
      // Remove this block in production to ensure real tokens are sent.
      const mockTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join("");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return new Response(
        JSON.stringify({
          success: true,
          message: `(Mock) Successfully claimed ${rewardAmount} $CHH! Set RPC/Keys for real tx.`,
          txHash: mockTxHash,
          amount: rewardAmount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialize Provider and Wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, ERC20_ABI, wallet);

    // Convert amount to BigInt based on decimals
    const amountToSend = ethers.parseUnits(rewardAmount.toString(), TOKEN_DECIMALS);

    console.log(`Sending ${rewardAmount} $CHH to ${walletAddress}...`);

    // Execute Transfer
    // NOTE: The backend wallet must have enough $CHH and native gas token (ETH/BaseETH)
    const tx = await contract.transfer(walletAddress, amountToSend);
    
    // Wait for transaction to be mined (optional, can return hash immediately for speed)
    // await tx.wait(); 

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully claimed ${rewardAmount} $CHH!`,
        txHash: tx.hash,
        amount: rewardAmount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error("Claim Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Transaction failed" }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
