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

        // 1. 読み取り (Public RPC)
        // Wallet Provider経由だと CALL_EXCEPTION (missing revert data) が発生することがあるため
        // 安定しているPublic RPCを使用してチェックを行います。
        const publicProvider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const readContract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, publicProvider);

        try {
            const canClaim = await readContract.canClaim(walletAddress);
            if (!canClaim) {
                return { success: false, message: "本日のボーナスは既に獲得済みです (JST 9:00更新)" };
            }
        } catch (error) {
            console.warn("[BonusService] canClaim check failed via Public RPC, proceeding blindly:", error);
            // 読み取りエラーでも、コントラクト実行自体は試行させる（本当に呼び出せない場合は次のステップでエラーになる）
        }

        // 2. 書き込み (Wallet Provider)
        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner(walletAddress);
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);

        const tx = await contract.claim({ gasLimit: 200000 });
        console.log("[BonusService] Claim tx sent:", tx.hash);

        // 3. 完了待ち (Public RPC ポーリング)
        // Ethers v6では waitForTransaction が削除されているため、getTransactionReceipt でポーリングします
        let receipt = null;
        for (let i = 0; i < 30; i++) { // 最大約30-60秒待機
            try {
                receipt = await publicProvider.getTransactionReceipt(tx.hash);
                if (receipt) break;
            } catch (e) {
                // RPCエラーは無視してリトライ
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        
        // ポーリングで取れなかった場合のフォールバック（署名者プロバイダーで待機）
        if (!receipt) {
             try {
                console.log("[BonusService] Polling timed out, falling back to tx.wait()");
                const r = await tx.wait();
                receipt = r;
             } catch (e) {
                console.error("[BonusService] Fallback wait failed:", e);
             }
        }

        if (!receipt || receipt.status === 0) {
            throw new Error("Claim transaction failed on chain.");
        }

        return { success: true, message: "ボーナス(100 $CHH)を獲得しました！", txHash: tx.hash };
    } catch (error: any) {
        return handleContractError(error);
    }
};