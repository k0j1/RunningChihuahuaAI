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

const SHOP_CONTRACT_ADDRESS = "0x077121a40B1f3cE2D755fA17E1f34e7554A44af0";
const SHOP_CONTRACT_ABI = [
  "function buyItem(uint256 amount, uint256 payAmount) external"
];

/**
 * アイテムを一括購入する (Approve & Buy)
 */
export const purchaseItemsWithTokens = async (walletAddress: string, totalItemCount: number, amountCHH: number): Promise<ClaimResult> => {
    try {
        let windowProvider: any = sdk.wallet.ethProvider || (window as any).ethereum;
        if (!windowProvider) throw new Error("ウォレットが見つかりません。");

        await switchToBaseNetwork(windowProvider);

        const provider = new ethers.BrowserProvider(windowProvider, "any");
        await new Promise(resolve => setTimeout(resolve, 500));
        const signer = await provider.getSigner();
        
        // Read ops using Provider, Write ops using Signer
        const tokenContractRead = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, provider);
        const tokenContractWrite = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, signer);
        const shopContract = new ethers.Contract(SHOP_CONTRACT_ADDRESS, SHOP_CONTRACT_ABI, signer);

        const priceWei = ethers.parseUnits(amountCHH.toString(), 18);

        // 1. Allowance Check (Retry logic for stability)
        let allowance;
        let retries = 2;
        while (retries >= 0) {
            try {
                allowance = await tokenContractRead.allowance(walletAddress, SHOP_CONTRACT_ADDRESS);
                break;
            } catch (err) {
                if (retries === 0) throw new Error("トークン承認額の確認に失敗しました。");
                retries--;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // 2. Approve if necessary
        if (allowance < priceWei) {
            console.log("[Shop] Requesting approval...");
            const approveTx = await tokenContractWrite.approve(SHOP_CONTRACT_ADDRESS, priceWei);
            await approveTx.wait();
        }

        // 3. Finalize Purchase
        console.log("[Shop] Executing buyItem...");
        const buyTx = await shopContract.buyItem(totalItemCount, priceWei);
        await buyTx.wait(); 

        return { success: true, message: "購入が完了しました！", txHash: buyTx.hash };
    } catch (error: any) {
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
        return "0.0";
    }
};
