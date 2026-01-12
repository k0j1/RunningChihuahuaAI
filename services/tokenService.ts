import { supabase } from './supabase';
import { ClaimResult, ItemType } from '../types';
import { ethers } from 'ethers';
import sdk from '@farcaster/frame-sdk';

// --- Configuration ---
const BASE_CHAIN_ID_HEX = '0x2105'; // 8453 in Hex0xb0525542e3d818460546332e76e511562dff9b07

const BASE_CHAIN_ID_DEC = 8453;

// 1. Score Reward Contract
const SCORE_CONTRACT_ADDRESS = "0x65F5661319C4d23c973C806e1e006Bb06d5557D2";

// 2. Daily Bonus Contract
const BONUS_CONTRACT_ADDRESS = "0x14254C321A6d0aB1986ecD8942e8f9603153634E";

// 3. Shop Contract
const SHOP_CONTRACT_ADDRESS = "0xe2813EAd888f98E1d97aF7f7bc78B957aE4Dd6f4";

// 4. $CHH Token Address
const CHH_TOKEN_ADDRESS = "0xb0525542e3d818460546332e76e511562dff9b07"; 

// ABIs
const SCORE_CONTRACT_ABI = [
  "function claimScore(uint256 score, bytes calldata signature) external",
  "function userClaims(address) view returns (uint32 lastClaimDay, uint8 dailyCount)"
];

const BONUS_CONTRACT_ABI = [
  "function claim() external",
  "function canClaim(address user) view returns (bool)"
];

const SHOP_CONTRACT_ABI = [
  "function buyItem(uint256 amount, uint256 payAmount) external"
];


const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

/**
 * Baseネットワークへの切り替えを強制する
 */
const switchToBaseNetwork = async (windowProvider: any) => {
    try {
        const currentChainId = await windowProvider.request({ method: 'eth_chainId' });
        
        // Normalize and check
        if (Number(currentChainId) === BASE_CHAIN_ID_DEC) {
            return;
        }

        try {
            await windowProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: BASE_CHAIN_ID_HEX }],
            });
            // Wait for network switch to propagate
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
            // チェーンが存在しない場合は追加を試みる (Error code 4902)
            if (switchError.code === 4902 || switchError.code === '4902' || switchError.message?.includes("Unrecognized chain")) {
                await windowProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: BASE_CHAIN_ID_HEX,
                            chainName: 'Base',
                            rpcUrls: ['https://mainnet.base.org'],
                            nativeCurrency: {
                                name: 'Ether',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: ['https://basescan.org']
                        },
                    ],
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                throw switchError;
            }
        }
    } catch (networkError: any) {
        console.error("Network switch error:", networkError);
        throw new Error("Failed to switch network to Base. Please switch manually in your wallet.");
    }
}

/**
 * $CHHトークンを支払ってアイテムを購入する
 * 新コントラクト対応: Approve -> buyItem(amount, payAmount)
 */
export const purchaseItemsWithTokens = async (walletAddress: string, totalItemCount: number, amountCHH: number): Promise<ClaimResult> => {
    try {
        console.log(`[Shop] Starting purchase flow: ${totalItemCount} items for ${amountCHH} $CHH`);
        
        let windowProvider: any; 
        if (sdk.wallet.ethProvider) windowProvider = sdk.wallet.ethProvider;
        else if (window.ethereum) windowProvider = window.ethereum;
        else throw new Error("No wallet detected.");

        // 関数内で実行
        const tokenAddr = ethers.getAddress(CHH_TOKEN_ADDRESS);
        const shopAddr = ethers.getAddress(SHOP_CONTRACT_ADDRESS);
        const userAddr = ethers.getAddress(walletAddress);

        // 1. ネットワーク切り替え
        await switchToBaseNetwork(windowProvider);

        // 2. プロバイダーの初期化
        const provider = new ethers.BrowserProvider(windowProvider); 
        const signer = await provider.getSigner();
        
        // 3. コントラクト初期化
        const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, signer);
        const shopContract = new ethers.Contract(shopAddr, SHOP_CONTRACT_ABI, signer);

        // 金額をWeiに変換
        const priceWei = ethers.parseUnits(amountCHH.toString(), 18);

        // *** CHHコントラクトアドレスのチェック
        const code = await provider.getCode(CHH_TOKEN_ADDRESS);
        console.log("DEBUG: Contract Code at address:", code);

        if (code === "0x") {
            console.error("❌ 致命的エラー: このネットワーク上のこのアドレスには、コントラクトが存在しません！ネットワーク設定かアドレスを再確認してください。");
        }

        // 4. Allowanceの確認（BigIntとして確実に扱う）
        const currentAllowance = await tokenContract.allowance(userAddr, shopAddr);
        console.log("[Shop] Current Allowance:", ethers.formatUnits(currentAllowance, 18));
        
        if (BigInt(currentAllowance) < BigInt(priceWei)) {
            console.log("[Shop] Insufficient allowance. Requesting approval...");
            // 十分な量をApprove（一回一回やるのが面倒なら最大値を設定することもありますが、今回はpriceWei分）
            const approveTx = await tokenContract.approve(shopAddr, priceWei);
            await approveTx.wait();
            console.log("[Shop] Approval confirmed.");
        }

        // 5. 購入実行
        console.log("[Shop] Sending buyItem transaction...");
        // ガスの見積もりで失敗することが多いため、少し余裕を持たせるか、そのまま実行
        const buyTx = await shopContract.buyItem(totalItemCount, priceWei, {
            // Farcaster内や特定のウォレットでガス推定が失敗する場合の対策
            gasLimit: 150000 
        });
        
        console.log("[Shop] Purchase transaction sent:", buyTx.hash);
        const receipt = await buyTx.wait(); 

        if (receipt.status === 0) throw new Error("Transaction reverted on-chain.");

        return {
            success: true,
            message: "Purchase successful! Items added to inventory.",
            txHash: buyTx.hash
        };
    } catch (error: any) {
        console.error("[Shop] Purchase error詳細:", error);
        // エラーオブジェクト自体が複雑な場合、メッセージを抽出
        const message = error.reason || error.message || "Unknown error occurred";
        return {
            success: false,
            message: `Purchase failed: ${message}`
        };
    }
};

export const fetchCHHBalance = async (walletAddress: string): Promise<string> => {
    try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        const contract = new ethers.Contract(CHH_TOKEN_ADDRESS, ERC20_ABI, provider);
        const balance = await contract.balanceOf(walletAddress);
        return ethers.formatUnits(balance, 18);
    } catch (error) {
        console.error("Error fetching balance:", error);
        return "0.0";
    }
};

// --- Score Claim Logic ---
export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    if (score > 60000) throw new Error("Invalid score.");

    const apiUrl = './api/claim.php'; 
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, score: score, type: 'score_claim' }) 
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Signature error');

    const { signature, adjusted_score } = data;
    
    let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
    if (!windowProvider) throw new Error("No crypto wallet found.");

    await switchToBaseNetwork(windowProvider);

    const provider = new ethers.BrowserProvider(windowProvider, "any");
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(SCORE_CONTRACT_ADDRESS, SCORE_CONTRACT_ABI, signer);

    const tx = await contract.claimScore(adjusted_score, signature);
    return { success: true, message: "Transaction sent!", txHash: tx.hash, amount: score };
  } catch (error: any) {
    return handleError(error);
  }
};

export const claimDailyBonus = async (walletAddress: string, itemType: ItemType): Promise<ClaimResult> => {
    try {
        let windowProvider: any = sdk.wallet.ethProvider || window.ethereum;
        if (!windowProvider) throw new Error("No crypto wallet found.");
        
        await switchToBaseNetwork(windowProvider);

        const provider = new ethers.BrowserProvider(windowProvider, "any");
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(BONUS_CONTRACT_ADDRESS, BONUS_CONTRACT_ABI, signer);

        const tx = await contract.claim({ gasLimit: 200000 });
        return { success: true, message: "Bonus claimed on-chain!", txHash: tx.hash };
    } catch (error: any) {
        return handleError(error);
    }
}

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

const handleError = (error: any): ClaimResult => {
    const errMsg = error.message || "";
    const detail = error.data || error.reason || error.shortMessage || "";
    let userMsg = `Error: ${errMsg}`;
    if (error.code === 4001 || error.code === 'ACTION_REJECTED') userMsg = "Transaction rejected.";
    else if (detail) userMsg = `Transaction reverted: ${detail}`;
    // CALL_EXCEPTIONのヒントを追加
    else if (error.code === 'CALL_EXCEPTION') userMsg = "Transaction failed (Wrong Network?). Switch to Base.";
    
    return { success: false, message: userMsg };
}
