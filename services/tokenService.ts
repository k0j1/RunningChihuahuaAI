import { supabase } from './supabase';
import { ClaimResult, ItemType } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// --- Configuration ---
const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex
const BASE_CHAIN_ID_DEC = 8453;

// 1. Score Reward Contract
const SCORE_CONTRACT_ADDRESS = "0x65F5661319C4d23c973C806e1e006Bb06d5557D2";

// 2. Daily Bonus Contract
const BONUS_CONTRACT_ADDRESS = "0x14254C321A6d0aB1986ecD8942e8f9603153634E";

// 3. Shop Contract
const SHOP_CONTRACT_ADDRESS = "0x077121a40B1f3cE2D755fA17E1f34e7554A44aF0";

// 4. $CHH Token Address
const CHH_TOKEN_ADDRESS = "0xb0525542e3d818460546332e76e511562dff9b07"; 

// ABIs
const SCORE_CONTRACT_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

const BONUS_CONTRACT_ABI = [
  "function claim() external",
  "function canClaim(address user) view returns (bool)"
];

const SHOP_CONTRACT_ABI = [
  "function buyItem(uint256 amount, uint256 payAmount) external"
];

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

/**
 * Baseネットワークへの切り替えを強制する
 */
const switchToBaseNetwork = async (windowProvider: any) => {
    try {
        const currentChainId = await windowProvider.request({ method: 'eth_chainId' });
        
        // すでにBaseの場合は何もしない
        if (currentChainId === BASE_CHAIN_ID_HEX || Number(currentChainId) === BASE_CHAIN_ID_DEC) {
            return;
        }

        try {
            await windowProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
        } catch (switchError: any) {
            // チェーンが存在しない場合は追加を試みる (Error code 4902)
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
    } catch (networkError: any) {
        console.error("Network switch error:", networkError);
        throw new Error("Failed to switch network to Base. Please switch manually in your wallet.");
    }
}

/**
 * $CHHトークンを支払ってアイテムを購入する
 * 新コントラクト対応: Approve -> buyItem(amount, payAmount)
 */
export const purchaseItemsWithTokens = async (walletAddress: string, totalItemCount: number, amountCHH: number): Promise<ClaimResult> => {
    try {
        console.log(`[Shop] Starting purchase flow: ${totalItemCount} items for ${amountCHH} $CHH`);
        
        let windowProvider: any; 
        if (sdk.wallet.ethProvider) windowProvider = sdk.wallet.ethProvider;
        else if (window.ethereum) windowProvider = window.ethereum;
        else throw new Error("No wallet detected.");

        // 1. ネットワーク切り替え
        await switchToBaseNetwork(windowProvider);

        // 2. プロバイダーの初期化 (ネットワーク切り替え後に初期化することが重要)
        // 'any' を指定して、基礎となるトランスポートのネットワーク変更を検知できるようにする
        const provider = new ethers.BrowserProvider(windowProvider, "any");
        
        // 3. チェーンIDの最終確認
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== BASE_CHAIN_ID_DEC) {
            throw new Error(`Wrong network detected (${network.chainId}). Please switch to Base Mainnet.`);
        }

        const signer = await provider.getSigner();
        
        const tokenContract = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, signer);
        const shopContract = new ethers.Contract(SHOP_CONTRACT_ADDRESS, SHOP_CONTRACT_ABI, signer);

        // 金額をWeiに変換 (18 decimals)
        const priceWei = ethers.parseUnits(amountCHH.toString(), 18);

        // 4. Check Allowance (承認済み金額を確認)
        let allowance;
        try {
            allowance = await tokenContract.allowance(walletAddress, SHOP_CONTRACT_ADDRESS);
        } catch (err: any) {
            console.error("Allowance check failed:", err);
            // CALL_EXCEPTIONはここで起きやすい
            throw new Error("Failed to check token allowance. Ensure you are on Base network.");
        }
        
        if (allowance < priceWei) {
            console.log("[Shop] Insufficient allowance. Requesting approval...");
            const approveTx = await tokenContract.approve(SHOP_CONTRACT_ADDRESS, priceWei);
            await approveTx.wait();
            console.log("[Shop] Approval confirmed.");
        }

        // 5. Execute Buy Item (購入実行)
        // buyItem(uint256 amount, uint256 payAmount)
        const buyTx = await shopContract.buyItem(totalItemCount, priceWei);
        console.log("[Shop] Purchase transaction sent:", buyTx.hash);
        
        await buyTx.wait(); 

        return {
            success: true,
            message: "Purchase successful! Items added to inventory.",
            txHash: buyTx.hash
        };
    } catch (error: any) {
        console.error("[Shop] Purchase error:", error);
        return handleError(error);
    }
};

export const fetchCHHBalance = async (walletAddress: string): Promise<string> => {
    try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        const contract = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        return ethers.formatUnits(balance, 18);
    } catch (error) {
        console.error("Error fetching balance:", error);
        return "0.0";
    }
};

// --- Score Claim Logic ---
export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    if (score > 60000) throw new Error("Invalid score.");

    const apiUrl = './api/claim.php'; 
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, score: score, type: 'score_claim' }) 
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Signature error');

    const { signature, adjusted_score } = data;
    
    let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
    if (!windowProvider) throw new Error("No crypto wallet found.");

    await switchToBaseNetwork(windowProvider);

    const provider = new ethers.BrowserProvider(windowProvider, "any");
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, signer);

    const tx = await contract.claimScore(adjusted_score, signature);
    return { success: true, message: "Transaction sent!", txHash: tx.hash, amount: score };
  } catch (error: any) {
    return handleError(error);
  }
};

export const claimDailyBonus = async (walletAddress: string, itemType: ItemType): Promise<ClaimResult> => {
    try {
        let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
        if (!windowProvider) throw new Error("No crypto wallet found.");
        
        await switchToBaseNetwork(windowProvider);

        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);

        const tx = await contract.claim({ gasLimit: 200000 });
        return { success: true, message: "Bonus claimed on-chain!", txHash: tx.hash };
    } catch (error: any) {
        return handleError(error);
    }
}

export const fetchDailyClaimCount = async (walletAddress: string): Promise<number> => {
    try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, provider);
        const info = await contract.userClaims(walletAddress);
        return Number(info[1]);
    } catch (error) {
        return 0;
    }
};

const handleError = (error: any): ClaimResult => {
    const errMsg = error.message || "";
    const detail = error.data || error.reason || error.shortMessage || "";
    let userMsg = `Error: ${errMsg}`;
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') userMsg = "Transaction rejected.";
    else if (detail) userMsg = `Transaction reverted: ${detail}`;
    // CALL_EXCEPTIONのヒントを追加
    else if (error.code === 'CALL_EXCEPTION') userMsg = "Transaction failed (Wrong Network?). Switch to Base.";
    
    return { success: false, message: userMsg };
}
