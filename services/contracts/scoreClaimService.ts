import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';
import { ClaimResult } from '../../types';
import { switchToBaseNetwork, handleContractError, BASE_CHAIN_ID_HEX, BASE_CHAIN_ID_DEC } from './contractUtils';

// コントラクト設定
const TOKEN_CONTRACT_ADDRESS = "0x65F5661319C4d23c973C806e1e006Bb06d5557D2"; 

const GAME_TOKEN_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

/**
 * ユーザーの当日の請求回数を取得する
 * ネットワークの不一致を避けるため、パブリックRPCを使用
 */
export const fetchDailyClaimCount = async (walletAddress: string): Promise<number> => {
  try {
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, provider);
    const info = await contract.userClaims(walletAddress);
    return Number(info[1]); // dailyCount を返す
  } catch (error) {
    console.error("[ScoreService] Error fetching claim count:", error);
    return 0;
  }
};

/**
 * スコアに応じたトークン報酬を受け取る
 * Ver.1.0.0 のロジックに基づき、署名取得からコントラクト実行までを処理
 */
export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    console.log(`[ScoreService] Preparing claim for Score=${score}`);

    // コントラクトの制約に基づいたバリデーション
    if (score > 60000) {
        throw new Error("Invalid score: 1回の請求上限（60,000）を超えています。");
    }

    // 1. バックエンド（PHP API）から署名を取得
    const apiUrl = './api/claim.php'; 
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, score: score })
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
      throw new Error((data && data.message) || '署名の取得に失敗しました。');
    }

    const { signature, adjusted_score } = data;
    
    if (!adjusted_score) {
        throw new Error("バックエンドから調整済みスコアが返されませんでした。");
    }

    // 2. ウォレットプロバイダーの準備
    let windowProvider: any = sdk.wallet.ethProvider || (window as any).ethereum;
    if (!windowProvider) {
       throw new Error("ウォレットが見つかりません。WarpcastまたはWeb3ブラウザを使用してください。");
    }

    // 3. ネットワーク切り替え (Baseネットワークへの切り替えを強制)
    await switchToBaseNetwork(windowProvider);

    // 4. ネットワーク切り替え後にプロバイダーを初期化
    const provider = new ethers.BrowserProvider(windowProvider, "any");
    
    console.log("[ScoreService] Sending claimScore transaction on Base...", { 
      originalScore: score,
      adjustedScore: adjusted_score, 
      target: TOKEN_CONTRACT_ADDRESS 
    });

    const signer = await provider.getSigner(walletAddress);
    const contract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, GAME_TOKEN_ABI, signer);

    // コントラクト実行（ガスリミットを明示的に指定）
    const tx = await contract.claimScore(adjusted_score, signature, {
        gasLimit: 300000 
    });
    
    console.log("[ScoreService] Transaction successfully requested:", tx.hash);

    return {
      success: true,
      message: "トランザクションを送信しました。ウォレットで確認してください。",
      txHash: tx.hash,
      amount: score 
    };

  } catch (error: any) {
    console.error("[ScoreService] Token Claim Error:", error);

    const errMsg = error.message || "";
    
    // 既知のエラーコードに基づくハンドリング
    if (error.code === 'NETWORK_ERROR') {
        return { 
          success: false, 
          message: `ネットワークエラー。ウォレットがBaseに接続されているか確認してください。` 
        };
    }

    if (error.code === 4001 || error.code === 'ACTION_REJECTED' || errMsg.includes('rejected')) {
        return { success: false, message: "トランザクションが拒否されました。" };
    }
    
    if (errMsg.includes('Invalid signature')) {
         return { success: false, message: "セキュリティチェックに失敗しました（無効な署名）。" };
    }
    if (errMsg.includes('Not enough tokens in vault')) {
         return { success: false, message: "報酬プールに十分なトークンがありません。" };
    }

    if (error.code === 'CALL_EXCEPTION') {
        return { 
          success: false, 
          message: `実行に失敗しました。本日の請求上限に達しているか、プールが空の可能性があります。` 
        };
    }

    return {
      success: false,
      message: `エラー: ${error.message || errMsg}`
    };
  }
};
