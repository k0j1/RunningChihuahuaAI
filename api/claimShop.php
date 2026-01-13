<?php
require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Elliptic\EC;
use kornrunner\Keccak;

header('Content-Type: application/json');

try {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();

    $privateKey = $_ENV['PRIVATE_KEY'] ?? null;
    if (!$privateKey) {
        throw new Exception('Server configuration error: Missing Private Key');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $address = $input['walletAddress'] ?? null;
    $itemCount = $input['itemCount'] ?? null;
    $payAmount = $input['payAmount'] ?? null;

    if (!$address || $itemCount === null || $payAmount === null) {
        throw new Exception('Missing required parameters');
    }

    // 1. アドレスをクリーンアップ
    $cleanAddress = strtolower(str_replace('0x', '', $address));
    
    // 2. アイテム数を uint256 (32 bytes) に変換
    $hexItemCount = str_pad(dechex($itemCount), 64, '0', STR_PAD_LEFT);
    
    // 3. 支払額を Wei (18 decimals) に変換し uint256 に変換
    $payAmountWei = bcmul((string)$payAmount, bcpow("10", "18"));
    $hexPayAmount = str_pad(gmp_strval(gmp_init($payAmountWei), 16), 64, '0', STR_PAD_LEFT);

    // 4. ハッシュ作成: keccak256(abi.encodePacked(address, itemCount, payAmount))
    $binaryData = hex2bin($cleanAddress . $hexItemCount . $hexPayAmount);
    $hash = Keccak::hash($binaryData, 256);

    // 5. EIP-191 プレフィックス付与
    $prefix = "\x19Ethereum Signed Message:\n32";
    $prefixedHash = Keccak::hash($prefix . hex2bin($hash), 256);

    // 6. 署名
    $ec = new EC('secp256k1');
    $keyPair = $ec->keyFromPrivate($privateKey);
    $signature = $keyPair->sign($prefixedHash, ['canonical' => true]);

    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27);

    $finalSignature = '0x' . $r . $s . $v;

    echo json_encode([
        'success' => true,
        'signature' => $finalSignature,
        'adjusted_item_count' => (int)$itemCount,
        'adjusted_pay_amount_wei' => $payAmountWei
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
