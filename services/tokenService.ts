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

// 3. Shop Contract (New Contract)
const SHOP_CONTRACT_ADDRESS = "0x077121a40B1f3Ce2D755fA17E1f34e7554A44af0";

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
 * 同期問題を避けるため、切り替え後に待機時間を設ける
 */
const switchToBaseNetwork = async (windowProvider: any) => {
    try {
        const currentChainId = await windowProvider.request({ method: 'eth_chainId' });
        if (Number(currentChainId) === BASE_CHAIN_ID_DEC) return;

        console.log("[Network] Switching to Base...");
        try {
            await windowProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
            // ネットワークが切り替わり、内部のRPCが更新されるまで待機
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (switchError: any) {
            if (switchError.code === 4902 || switchError.code === '4902' || switchError.message?.includes("Unrecognized chain")) {
                await windowProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: BASE_CHAIN_ID_HEX,
                        chainName: 'Base',
                        rpcUrls: ['https://mainnet.base.org'],
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                        blockExplorerUrls: ['https://basescan.org']
                    }],
                });
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                throw switchError;
            }
        }
    } catch (networkError: any) {
        console.error("Network switch error:", networkError);
        throw new Error("Baseネットワークへの切り替えに失敗しました。ウォレットで手動でBaseに切り替えてください。");
    }
}

/**
 * スコアに応じたトークン報酬を受け取る (結果画面のアクション)
 * ショップ対応前の安定したシーケンスに復元
 */
export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    console.log(`[Claim] Starting claim flow for score: ${score}`);
    if (score <= 0) throw new Error("スコアがありません。");

    // 1. APIから署名を取得
    const apiUrl = './api/claim.php'; 
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, score: score, type: 'score_claim' }) 
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || '署名の取得に失敗しました');

    const { signature, adjusted_score } = data;
    
    // 2. ウォレットプロバイダーの取得
    let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
    if (!windowProvider) throw new Error("ウォレットが見つかりません。");

    // 3. ネットワーク切り替え
    await switchToBaseNetwork(windowProvider);

    // 4. コントラクト実行
    const provider = new ethers.BrowserProvider(windowProvider, "any");
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, signer);

    console.log("[Claim] Sending transaction to contract...");
    const tx = await contract.claimScore(adjusted_score, signature);
    console.log("[Claim] Transaction sent:", tx.hash);

    await tx.wait();
    return { success: true, message: "請求が完了しました！", txHash: tx.hash, amount: score };
  } catch (error: any) {
    console.error("[Claim] Error:", error);
    return handleError(error);
  }
};

/**
 * $CHHトークンを支払ってアイテムを購入する (ショップのアクション)
 * Allowanceチェック時のエラーを防止するため、Providerを分離
 */
export const purchaseItemsWithTokens = async (walletAddress: string, totalItemCount: number, amountCHH: number): Promise<ClaimResult> => {
    try {
        console.log(`[Shop] Starting purchase: ${totalItemCount} items for ${amountCHH} $CHH`);
        
        let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
        if (!windowProvider) throw new Error("ウォレットが見つかりません。");

        await switchToBaseNetwork(windowProvider);

        const provider = new ethers.BrowserProvider(windowProvider, "any");
        // 同期ラグを考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const signer = await provider.getSigner();
        
        // 読み取り専用はProviderを使用することで、Signer特有の呼び出しエラーを回避
        const tokenContractRead = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, provider);
        const tokenContractWrite = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, signer);
        const shopContract = new ethers.Contract(SHOP_CONTRACT_ADDRESS, SHOP_CONTRACT_ABI, signer);

        const priceWei = ethers.parseUnits(amountCHH.toString(), 18);

        // Allowanceの確認 (リトライ付き)
        let allowance;
        let retries = 2;
        while (retries >= 0) {
            try {
                allowance = await tokenContractRead.allowance(walletAddress, SHOP_CONTRACT_ADDRESS);
                break;
            } catch (err) {
                if (retries === 0) throw new Error("トークン承認額の確認に失敗しました。Baseネットワークであることを確認してください。");
                retries--;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (allowance < priceWei) {
            console.log("[Shop] Requesting approval...");
            const approveTx = await tokenContractWrite.approve(SHOP_CONTRACT_ADDRESS, priceWei);
            await approveTx.wait();
        }

        console.log("[Shop] Executing buyItem...");
        const buyTx = await shopContract.buyItem(totalItemCount, priceWei);
        await buyTx.wait(); 

        return { success: true, message: "購入が完了しました！", txHash: buyTx.hash };
    } catch (error: any) {
        console.error("[Shop] Error:", error);
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
        return "0.0";
    }
};

export const claimDailyBonus = async (walletAddress: string, itemType: ItemType): Promise<ClaimResult> => {
    try {
        let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
        await switchToBaseNetwork(windowProvider);
        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);
        const tx = await contract.claim({ gasLimit: 200000 });
        return { success: true, message: "ボーナスを獲得しました！", txHash: tx.hash };
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
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') userMsg = "トランザクションが拒否されました。";
    else if (detail) userMsg = `エラー: ${detail}`;
    else if (error.code === 'CALL_EXCEPTION') userMsg = "ネットワークエラーが発生しました。Baseネットワークであることを確認してください。";
    return { success: false, message: userMsg };
}
