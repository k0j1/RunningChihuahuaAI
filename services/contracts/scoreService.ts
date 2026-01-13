import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';
import { ClaimResult } from '../../types';
import { switchToBaseNetwork, handleContractError } from './contractUtils';

const SCORE_CONTRACT_ADDRESS = "0x65F5661319C4d23c973C806e1e006Bb06d5557D2";
const SCORE_CONTRACT_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

/**
 * スコア請求を実行する
 */
export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
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
    
    // 2. ネットワーク切り替え
    let windowProvider: any = sdk.wallet.ethProvider || (window as any).ethereum;
    if (!windowProvider) throw new Error("ウォレットが見つかりません。");
    await switchToBaseNetwork(windowProvider);

    // 3. 署名付きでコントラクト実行
    const provider = new ethers.BrowserProvider(windowProvider, "any");
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, signer);

    const tx = await contract.claimScore(adjusted_score, signature);
    await tx.wait();

    return { success: true, message: "請求が完了しました！", txHash: tx.hash, amount: score };
  } catch (error: any) {
    return handleContractError(error);
  }
};

/**
 * 本日の請求回数を取得する
 */
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
