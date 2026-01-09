
import { supabase } from './supabase';
import { ClaimResult, ItemType } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// --- Configuration ---
const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// 1. Score Reward Contract (Old Implementation)
const SCORE_CONTRACT_ADDRESS = "0x65F5661319C4d23c973C806e1e006Bb06d5557D2";

// 2. Daily Bonus Contract (New Implementation)
const BONUS_CONTRACT_ADDRESS = "0x14254C321A6d0aB1986ecD8942e8f9603153634E";

// ABIs
const SCORE_CONTRACT_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

const BONUS_CONTRACT_ABI = [
  "function claimDailyReward(uint256 itemType, bytes calldata signature) external"
];

const switchToBaseNetwork = async (windowProvider: any) => {
    try {
        const currentChainId = await windowProvider.request({ method: 'eth_chainId' });
        
        if (currentChainId !== BASE_CHAIN_ID_HEX && Number(currentChainId) !== BASE_CHAIN_ID_DEC) {
            try {
                await windowProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: BASE_CHAIN_ID_HEX }],
                });
            } catch (switchError: any) {
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
}

// --- Score Claim Logic (Uses SCORE_CONTRACT_ADDRESS & api/claim.php) ---
export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    console.log(`Preparing claim for Score=${score} on Contract=${SCORE_CONTRACT_ADDRESS}`);

    if (score > 60000) {
        throw new Error("Invalid score: Exceeds maximum limit of 60,000.");
    }

    // 1. Request Signature from Backend (claim.php)
    const apiUrl = './api/claim.php'; 

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, score: score, type: 'score_claim' }) 
    });

    const text = await response.text();
    let data: any;
    try {
        data = JSON.parse(text);
    } catch {
        if (!response.ok) throw new Error(text || `HTTP Error ${response.status}`);
    }

    if (!response.ok) {
        throw new Error((data && data.message) || text || `Server error: ${response.status}`);
    }

    if (!data || !data.success || !data.signature) {
      throw new Error((data && data.message) || 'Failed to generate signature from backend');
    }

    const { signature, adjusted_score } = data;
    
    // 2. Prepare Wallet Provider
    let windowProvider: any; 
    if (sdk.wallet.ethProvider) windowProvider = sdk.wallet.ethProvider;
    else if (window.ethereum) windowProvider = window.ethereum;
    else throw new Error("No crypto wallet found. Please use a Web3 browser or Warpcast.");

    if (sdk.actions.ready) await sdk.actions.ready();

    // 3. Switch Network
    await switchToBaseNetwork(windowProvider);

    // 4. Initialize Provider & Contract
    const provider = new ethers.BrowserProvider(windowProvider);
    const signer = await provider.getSigner(walletAddress);
    const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, signer);

    // 5. Send Transaction
    const tx = await contract.claimScore(adjusted_score, signature, {
        gasLimit: 300000 
    });
    
    console.log("Transaction successfully requested:", tx.hash);

    return {
      success: true,
      message: "Transaction sent! Please confirm in your wallet.",
      txHash: tx.hash,
      amount: score 
    };

  } catch (error: any) {
    console.error("Token Claim Error:", error);
    return handleError(error);
  }
};

// --- Daily Bonus Claim Logic (Uses BONUS_CONTRACT_ADDRESS & api/claimBonus.php) ---
export const claimDailyBonus = async (walletAddress: string, itemType: ItemType): Promise<ClaimResult> => {
    try {
        console.log(`Preparing Daily Bonus Claim for Item=${itemType} on Contract=${BONUS_CONTRACT_ADDRESS}`);
        
        // Map ItemType enum to integer for contract
        // MAX_HP = 1, HEAL = 2, SHIELD = 3
        let itemTypeId = 0;
        if (itemType === ItemType.MAX_HP) itemTypeId = 1;
        else if (itemType === ItemType.HEAL_ON_DODGE) itemTypeId = 2;
        else if (itemType === ItemType.SHIELD) itemTypeId = 3;
        
        if (itemTypeId === 0) throw new Error("Invalid item type for claim");

        // 1. Request Signature (claimBonus.php)
        const apiUrl = './api/claimBonus.php';
        console.log(`Fetching signature from ${apiUrl}...`);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, itemType: itemTypeId }) 
        });

        const text = await response.text();
        console.log("Backend Response:", text);
        
        let data: any;
        try { data = JSON.parse(text); } catch { if (!response.ok) throw new Error(text); }

        if (!response.ok) throw new Error((data && data.message) || text);
        if (!data || !data.success || !data.signature) throw new Error((data && data.message) || 'Failed to generate signature');

        const { signature } = data;
        console.log("Received Signature:", signature);

        // 2. Prepare Wallet
        let windowProvider: any; 
        if (sdk.wallet.ethProvider) windowProvider = sdk.wallet.ethProvider;
        else if (window.ethereum) windowProvider = window.ethereum;
        else throw new Error("No crypto wallet found.");

        if (sdk.actions.ready) await sdk.actions.ready();

        // 3. Switch Network
        await switchToBaseNetwork(windowProvider);

        // 4. Send Transaction
        const provider = new ethers.BrowserProvider(windowProvider);
        const signer = await provider.getSigner(walletAddress);
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);

        // Debug: Static Call to check for revert reason before sending transaction
        console.log("Attempting staticCall check...");
        try {
            await contract.claimDailyReward.staticCall(itemTypeId, signature);
            console.log("staticCall successful.");
        } catch (callError: any) {
            console.error("staticCall failed:", callError);
            const reason = callError.reason || callError.shortMessage || callError.message;
            throw new Error(`Contract Verification Failed: ${reason}`);
        }

        const tx = await contract.claimDailyReward(itemTypeId, signature, {
            gasLimit: 300000 
        });

        console.log("Daily Bonus Transaction Hash:", tx.hash);

        return {
            success: true,
            message: "Bonus claimed on-chain!",
            txHash: tx.hash
        };

    } catch (error: any) {
        console.error("Daily Bonus Claim Error:", error);
        return handleError(error);
    }
}

export const fetchDailyClaimCount = async (walletAddress: string): Promise<number> => {
    // This function was used for the Score contract logic.
    // Keeping it wired to SCORE_CONTRACT_ADDRESS for now.
    try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, provider);
        const info = await contract.userClaims(walletAddress);
        return Number(info[1]);
    } catch (error) {
        console.error("Error fetching claim count:", error);
        return 0;
    }
};

const handleError = (error: any): ClaimResult => {
    const errMsg = error.message || "";
    const detail = error.data || error.reason || error.shortMessage || "";
    
    console.error("Detailed Error Object:", error);
    
    let userMsg = `Error: ${errMsg}`;
    
    if (error.code === 'NETWORK_ERROR') userMsg = `Network error. Check connection.`;
    else if (error.code === 4001 || error.code === 'ACTION_REJECTED' || errMsg.includes('rejected')) userMsg = "Transaction rejected by user.";
    else if (errMsg.includes('Invalid signature') || detail.includes('Invalid signature')) userMsg = "Contract Rejected: Invalid Signature.";
    else if (errMsg.includes('Already claimed') || detail.includes('Already claimed')) userMsg = "Contract Rejected: Already claimed today.";
    else if (errMsg.includes('execution reverted')) userMsg = `Transaction reverted: ${detail || "Unknown reason"}`;
    else if (errMsg.includes('Contract Verification Failed')) userMsg = errMsg; // Pass through our custom staticCall error

    return { success: false, message: userMsg };
}
