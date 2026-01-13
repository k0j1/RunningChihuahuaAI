<?php
/**
 * Shop Claim API - Generates EIP-191 signatures for in-game item purchases.
 * 
 * Usage: POST JSON { "walletAddress": "0x...", "itemCount": 3, "payAmount": 500 }
 * Requirements: bcmath, gmp extensions and composer dependencies.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use kornrunner\Keccak;
use Elliptic\EC;
use Dotenv\Dotenv;

header('Content-Type: application/json');

try {
    // 1. 環境変数のロード
    if (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__);
    } else {
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
    }
    $dotenv->load();

    $privateKey = $_ENV['PRIVATE_KEY'] ?? null;
    if (!$privateKey) {
        throw new Exception("Server configuration error: Missing PRIVATE_KEY");
    }

    // 2. 入力データの取得とバリデーション
    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? null;
    $itemCount = isset($input['itemCount']) ? (int)$input['itemCount'] : 0;
    $payAmount = isset($input['payAmount']) ? $input['payAmount'] : 0;

    if (!$walletAddress || $itemCount <= 0 || $payAmount <= 0) {
        throw new Exception("Invalid request parameters: walletAddress, itemCount, and payAmount are required.");
    }

    // 3. 金額の計算 ($CHH は 18 桁の decimals)
    // フロントエンドから送られてきた数値（例: 500）を Wei (10^18) に変換
    $payAmountWei = bcmul((string)$payAmount, bcpow("10", "18"));

    // 4. ハッシュの作成 (Solidity: keccak256(abi.encodePacked(msg.sender, amount, payAmount)))
    // EthereumのABIエンコードルールに従い、各値をパディングして結合します。
    
    // Address: 20bytes (40 hex chars)
    $cleanAddress = strtolower(str_replace('0x', '', $walletAddress));
    
    // Amount (uint256): 32bytes (64 hex chars)
    $amountHex = str_pad(gmp_strval(gmp_init($itemCount), 16), 64, '0', STR_PAD_LEFT);
    
    // PayAmount (uint256): 32bytes (64 hex chars)
    $payAmountHex = str_pad(gmp_strval(gmp_init($payAmountWei), 16), 64, '0', STR_PAD_LEFT);

    // 結合してハッシュ化
    $binaryData = hex2bin($cleanAddress . $amountHex . $payAmountHex);
    $hash = Keccak::hash($binaryData, 256);

    // 5. EIP-191 署名の生成
    // プレフィックスを付与: "\x19Ethereum Signed Message:\n32" + hash
    $ethMessagePrefix = "\x19Ethereum Signed Message:\n32";
    $ethHash = Keccak::hash($ethMessagePrefix . hex2bin($hash), 256);

    $ec = new EC('secp256k1');
    $keyPair = $ec->keyFromPrivate($privateKey);
    $signature = $keyPair->sign($ethHash, ['canonical' => true]);

    // r, s, v のフォーマット
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27);

    $finalSignature = '0x' . $r . $s . $v;

    // 6. レスポンス
    echo json_encode([
        'success' => true,
        'signature' => $finalSignature,
        'adjusted_item_count' => $itemCount,
        'adjusted_pay_amount_wei' => $payAmountWei,
        'wallet' => $walletAddress
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}