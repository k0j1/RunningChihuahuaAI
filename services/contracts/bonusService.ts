import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';
import { ClaimResult, ItemType } from '../../types';
import { switchToBaseNetwork, handleContractError, BASE_RPC_URL } from './contractUtils';

const BONUS_CONTRACT_ADDRESS = "0x14254C321A6d0aB1986ecD8942e8f9603153634E";
const BONUS_CONTRACT_ABI = [
  "function claim() external",
  "function canClaim(address user) view returns (bool)"
];

/**
 * デイリーボーナスを請求する
 */
export const claimDailyBonus = async (walletAddress: string, itemType: ItemType): Promise<ClaimResult> => {
    try {
        let windowProvider: any = sdk.wallet.ethProvider || (window as any).ethereum;
        if (!windowProvider) throw new Error("ウォレットが見つかりません。");
        
        await switchToBaseNetwork(windowProvider);

        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);

        const tx = await contract.claim({ gasLimit: 200000 });
        console.log("[BonusService] Claim tx sent:", tx.hash);

        // Public RPCを使用して完了を待機（埋め込みウォレットのreceipt取得エラー回避）
        const publicProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const receipt = await publicProvider.waitForTransaction(tx.hash);
        
        if (!receipt || receipt.status === 0) {
            throw new Error("Claim transaction failed on chain.");
        }

        return { success: true, message: "ボーナスを獲得しました！", txHash: tx.hash };
    } catch (error: any) {
        return handleContractError(error);
    }
};