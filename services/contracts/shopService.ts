import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';
import { ClaimResult } from '../../types';
import { 
    switchToBaseNetwork, 
    handleContractError, 
    CHH_TOKEN_ADDRESS, 
    ERC20_ABI,
    BASE_RPC_URL
} from './contractUtils';

// コントラクト設定
const SHOP_CONTRACT_ADDRESS = "0x0d013d7DC17E8240595778D1db7241f176Ca51F9";

// 署名付きの購入関数に対応したABI
const SHOP_CONTRACT_ABI = [
  "function buyItem(uint256 amount, uint256 payAmount, bytes calldata signature) external"
];

/**
 * アイテムを一括購入する (claimShop.php から署名取得 -> Approve -> buyItem)
 */
export const purchaseItemsWithTokens = async (walletAddress: string, totalItemCount: number, amountCHH: number): Promise<ClaimResult> => {
    try {
        console.log(`[ShopService] Starting purchase flow: ${totalItemCount} items for ${amountCHH} $CHH`);
        if (totalItemCount <= 0) throw new Error("アイテムが選択されていません。");

        // 1. ショップ専用バックエンド（claimShop.php）から署名を取得
        const apiUrl = './api/claimShop.php'; 
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                walletAddress, 
                itemCount: totalItemCount, 
                payAmount: amountCHH 
            })
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            if (!response.ok) throw new Error(text || `HTTP Error ${response.status}`);
        }

        if (!response.ok || !data.success || !data.signature) {
            throw new Error((data && data.message) || '署名の取得に失敗しました。');
        }

        // バックエンドから返された確定データ
        const { signature, adjusted_item_count, adjusted_pay_amount_wei } = data;

        // 2. ウォレットプロバイダーの準備
        let windowProvider: any = sdk.wallet.ethProvider || (window as any).ethereum;
        if (!windowProvider) {
            throw new Error("ウォレットが見つかりません。");
        }

        // 3. ネットワーク切り替え (Base)
        await switchToBaseNetwork(windowProvider);

        // 4. プロバイダーと署名者を初期化
        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner(walletAddress);
        
        // 読み取り用プロバイダー (Public RPC) - 完了待ち(wait)に使用
        const publicProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        
        // Allowance確認はPublic RPC経由で行う
        const tokenContractRead = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, publicProvider);
        const tokenContractWrite = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, signer);
        const shopContract = new ethers.Contract(SHOP_CONTRACT_ADDRESS, SHOP_CONTRACT_ABI, signer);

        // 支払額を確定 (バックエンドからのWei値を優先的に使用)
        const priceWei = adjusted_pay_amount_wei ? ethers.getBigInt(adjusted_pay_amount_wei) : ethers.parseUnits(amountCHH.toString(), 18);

        // 5. Allowance (承認額) の確認
        let allowance;
        try {
            allowance = await tokenContractRead.allowance(walletAddress, SHOP_CONTRACT_ADDRESS);
        } catch (err) {
            console.warn("[ShopService] Allowance check failed, retrying...", err);
            // ラグ対策のリトライ
            await new Promise(resolve => setTimeout(resolve, 1000));
            allowance = await tokenContractRead.allowance(walletAddress, SHOP_CONTRACT_ADDRESS);
        }
        
        console.log(`[ShopService] Allowance: ${allowance}, Price: ${priceWei}`);

        // 6. 必要に応じて Approve を実行
        if (allowance < priceWei) {
            console.log("[ShopService] Requesting approval...");
            // ガス見積もりエラー(estimateGas failed)を回避するため、gasLimitを明示的に指定
            const approveTx = await tokenContractWrite.approve(SHOP_CONTRACT_ADDRESS, priceWei, { gasLimit: 100000 });
            console.log("[ShopService] Approval tx sent:", approveTx.hash);
            
            // ウォレットプロバイダーでのwait()は失敗する場合があるため、Public RPCで待機する
            const receipt = await publicProvider.waitForTransaction(approveTx.hash);
            if (!receipt || receipt.status === 0) {
                throw new Error("Approval transaction failed on chain.");
            }
            console.log("[ShopService] Approval confirmed.");
        }

        // 7. 購入トランザクションの実行 (署名を添付)
        console.log("[ShopService] Executing buyItem with backend signature...");
        const buyTx = await shopContract.buyItem(
            adjusted_item_count || totalItemCount, 
            priceWei, 
            signature, 
            { gasLimit: 500000 }
        );
        
        console.log("[ShopService] Purchase transaction sent:", buyTx.hash);
        
        // ウォレットプロバイダーでのwait()は失敗する場合があるため、Public RPCで待機する
        const receipt = await publicProvider.waitForTransaction(buyTx.hash);
        if (!receipt || receipt.status === 0) {
             throw new Error("Purchase transaction failed on chain.");
        }
        
        console.log("[ShopService] Purchase confirmed!");

        return { 
            success: true, 
            message: "購入が完了しました！", 
            txHash: buyTx.hash 
        };
    } catch (error: any) {
        console.error("[ShopService] Purchase Error:", error);
        return handleContractError(error);
    }
};

/**
 * $CHHトークンの残高を取得する
 */
export const fetchCHHBalance = async (walletAddress: string): Promise<string> => {
    try {
        const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const contract = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        return ethers.formatUnits(balance, 18);
    } catch (error) {
        console.error("[ShopService] Failed to fetch CHH balance:", error);
        return "0.0";
    }
};