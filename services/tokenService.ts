/**
 * Token Service Facade
 * 
 * 以前の tokenService.ts の機能を維持しつつ、実装を以下のモジュールに分割・委譲しました。
 * 実装の詳細は services/contracts/ フォルダ内の各ファイルを参照してください。
 */

// 共通ユーティリティと定数
export { 
    switchToBaseNetwork, 
    handleContractError,
    CHH_TOKEN_ADDRESS,
    BASE_CHAIN_ID_DEC,
    BASE_RPC_URL,
    ERC20_ABI
} from './contracts/contractUtils';

// スコア報酬関連 (Claim)
export { 
    claimTokenReward, 
    fetchDailyClaimCount 
} from './contracts/scoreService';

// デイリーボーナス関連
export { 
    claimDailyBonus 
} from './contracts/bonusService';

// ショップ・アイテム購入関連
export { 
    purchaseItemsWithTokens, 
    fetchCHHBalance 
} from './contracts/shopService';
