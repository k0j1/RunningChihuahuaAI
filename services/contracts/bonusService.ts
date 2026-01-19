import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';
import { ClaimResult } from '../../types';
import { switchToBaseNetwork, handleContractError, BASE_RPC_URL } from './contractUtils';

const BONUS_CONTRACT_ADDRESS = "0x9B9191f213Afe0588570028174C97b3751c20Db0";
const BONUS_CONTRACT_ABI = [
  "function claim() external",
  "function canClaim(address user) view returns (bool)"
];

/**
 * デイリーボーナスを請求する
 * コントラクトからは 100 CHH が送金されます
 */
export const claimDailyBonus = async (walletAddress: string): Promise<ClaimResult> => {
    try {
        let windowProvider: any = sdk.wallet.ethProvider || (window as any).ethereum;
        if (!windowProvider) throw new Error("ウォレットが見つかりません。");
        
        await switchToBaseNetwork(windowProvider);

        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner(walletAddress);
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);

        // 事前に獲得可能かチェック
        const canClaim = await contract.canClaim(walletAddress);
        if (!canClaim) {
            return { success: false, message: "本日のボーナスは既に獲得済みです (JST 9:00更新)" };
        }

        const tx = await contract.claim({ gasLimit: 200000 });
        console.log("[BonusService] Claim tx sent:", tx.hash);

        // Public RPCを使用して完了を待機（埋め込みウォレットのreceipt取得エラー回避）
        const publicProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const receipt = await publicProvider.waitForTransaction(tx.hash);
        
        if (!receipt || receipt.status === 0) {
            throw new Error("Claim transaction failed on chain.");
        }

        return { success: true, message: "ボーナス(100 $CHH)を獲得しました！", txHash: tx.hash };
    } catch (error: any) {
        return handleContractError(error);
    }
};