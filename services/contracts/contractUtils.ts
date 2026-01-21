import { ethers } from 'ethers';

// --- Chain Configuration ---
export const BASE_CHAIN_ID_HEX = '0x2105'; // 8453
export const BASE_CHAIN_ID_DEC = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';

// --- Token Configuration ---
export const CHH_TOKEN_ADDRESS = "0xb0525542e3d818460546332e76e511562dff9b07";

// --- Other Contract Addresses (Exported for Admin) ---
export const SCORE_VAULT_ADDRESS = "0x65F5661319C4d23c973C806e1e006Bb06d5557D2";
export const BONUS_CONTRACT_ADDRESS = "0x9B9191f213Afe0588570028174C97b3751c20Db0";
export const SHOP_CONTRACT_ADDRESS = "0x0d013d7DC17E8240595778D1db7241f176Ca51F9";

// --- ABIs ---
export const ERC20_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

/**
 * Baseメインネットへの切り替えを試行する
 * 同期問題を避けるため、切り替え後に1.5秒待機する (Ver.1.0.0基準)
 */
export const switchToBaseNetwork = async (windowProvider: any) => {
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
                        rpcUrls: [BASE_RPC_URL],
                        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                        blockExplorerUrls: ['https://basescan.org']
                    }],
                });
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                throw switchError;
            }
        }
    } catch (error: any) {
        console.error("[Network] switch error:", error);
        throw new Error("Baseネットワークへの切り替えに失敗しました。ウォレットの設定を確認してください。");
    }
};

/**
 * コントラクトエラーの共通ハンドリング (Ver.1.0.0基準のメッセージ)
 */
export const handleContractError = (error: any) => {
    console.error("[Contract Error]:", error);
    const errMsg = error.message || "";
    const detail = error.data || error.reason || error.shortMessage || "";
    
    let userMsg = `エラー: ${errMsg}`;
    
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        userMsg = "トランザクションが拒否されました。";
    } else if (detail) {
        userMsg = `エラー詳細: ${detail}`;
    } else if (error.code === 'CALL_EXCEPTION') {
        userMsg = "実行に失敗しました。Baseネットワークであることを確認してください。";
    }
    
    return { success: false, message: userMsg };
};