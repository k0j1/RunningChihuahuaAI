<?php
// api/claim.php

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Preflightリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// オートローダーの読み込み
$vendorPath = __DIR__ . '/../vendor/autoload.php'; // ローカル
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    $vendorPath = __DIR__ . '/vendor/autoload.php'; // 本番
}

if (!file_exists($vendorPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Composer dependencies not installed.']);
    exit;
}

require_once $vendorPath;

use Dotenv\Dotenv;
use kornrunner\Keccak;
use Elliptic\EC;

try {
    // .env ファイルの読み込み
    if (file_exists(__DIR__ . '/../.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
        $dotenv->load();
    } elseif (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
    }

    $privateKeyHex = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');

    if (!$privateKeyHex) {
        throw new Exception('Server configuration error: Private Key not found.');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? '';
    $score = $input['score'] ?? 0;

    if (!$walletAddress || !is_numeric($score)) {
        throw new Exception('Invalid input: walletAddress and score are required.');
    }

    // --- 1. データパッキング (Solidity: abi.encodePacked(walletAddress, score)) ---
    
    // Address (20 bytes)
    $addrHex = str_replace('0x', '', $walletAddress);
    if (strlen($addrHex) !== 40) {
        throw new Exception('Invalid wallet address format.');
    }
    
    // Score (uint256 -> 32 bytes hex)
    $scoreHex = str_pad(dechex((int)$score), 64, '0', STR_PAD_LEFT);
    
    // バイナリ結合
    $packedData = hex2bin($addrHex) . hex2bin($scoreHex);

    // --- 2. メッセージハッシュ (Keccak256) ---
    // Keccak::hash($data, 256) はHex文字列を返す
    $messageHashHex = Keccak::hash($packedData, 256);
    $messageHashBin = hex2bin($messageHashHex);

    // --- 3. Ethereum Signed Message Prefix ---
    // "\x19Ethereum Signed Message:\n32" + binary hash
    $prefix = "\x19Ethereum Signed Message:\n32";
    $prefixedMessage = $prefix . $messageHashBin;
    
    // 署名対象の最終ハッシュ (Hex文字列)
    $finalHashHex = Keccak::hash($prefixedMessage, 256);

    // --- 4. 署名 (Secp256k1) ---
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKeyHex);
    
    // 署名生成
    $signature = $key->sign($finalHashHex, ['canonical' => true]);
    
    $r = $signature->r->toString(16);
    $s = $signature->s->toString(16);
    $v = $signature->recoveryParam + 27;

    $r = str_pad($r, 64, '0', STR_PAD_LEFT);
    $s = str_pad($s, 64, '0', STR_PAD_LEFT);
    $v = dechex($v);

    $fullSignature = '0x' . $r . $s . $v;

    echo json_encode([
        'success' => true,
        'message' => 'Signature generated successfully.',
        'signature' => $fullSignature,
        'score' => (int)$score
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}