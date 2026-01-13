import { ethers } from 'ethers';

// --- Chain Configuration ---
export const BASE_CHAIN_ID_HEX = '0x2105'; // 8453
export const BASE_CHAIN_ID_DEC = 8453;
export const BASE_RPC_URL = 'https://mainnet.base.org';

// --- Token Configuration ---
export const CHH_TOKEN_ADDRESS = "0xb0525542e3d818460546332e76e511562dff9b07";

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
            // ネットワーク同期のための待機
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
        console.error("Network switch error:", error);
        throw new Error("Baseネットワークへの切り替えに失敗しました。ウォレットの設定を確認してください。");
    }
};

/**
 * コントラクトエラーの共通ハンドリング
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
