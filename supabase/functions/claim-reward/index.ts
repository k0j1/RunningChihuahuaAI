// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ethers } from 'https://esm.sh/ethers@6.7.0'

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { walletAddress, score } = await req.json()

    if (!walletAddress || score === undefined) {
      throw new Error('Missing walletAddress or score')
    }

    // --- SECURITY & VALIDATION ---
    // In production: Verify score integrity via DB check or signature verification.
    
    // We are now signing the exact score provided.
    // Ensure the score passed here matches what is stored in the database if necessary.
    
    // --- SIGNATURE GENERATION ---
    const privateKey = Deno.env.get('PRIVATE_KEY');
    if (!privateKey) {
       throw new Error("Server configuration error: Missing Private Key");
    }

    const wallet = new ethers.Wallet(privateKey);

    // 0. Ensure Address is Checksummed
    // This is critical. Solidity ecrecover returns a checksummed address.
    // If we hash a lowercase string, the signature will differ from what the contract recovers.
    const checksummedAddress = ethers.getAddress(walletAddress);

    // 1. Create the Hash matching Solidity's: keccak256(abi.encodePacked(msg.sender, score))
    // In ethers v6, solidityPackedKeccak256 handles abi.encodePacked + keccak256
    const hash = ethers.solidityPackedKeccak256(
      ["address", "uint256"], 
      [checksummedAddress, score]
    );

    // 2. Sign the binary hash. 
    // ethers.wallet.signMessage automatically adds the "\x19Ethereum Signed Message:\n" prefix (EIP-191).
    // Solidity's `toEthSignedMessageHash().recover(signature)` expects this standard signature.
    // We must pass the hash as bytes, otherwise it treats the hash string as text.
    const signature = await wallet.signMessage(ethers.getBytes(hash));

    console.log(`Generated signature for ${checksummedAddress} with score ${score}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Signature generated successfully.`,
        signature: signature,
        score: score
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error("Signing Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Signing failed" }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})