<?php
// api/claim.php

// CORSヘッダー
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// プリフライトリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Elliptic\EC;
use kornrunner\Keccak;

try {
    // 1. 環境変数の読み込み
    if (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
    }

    $privateKey = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');
    if (!$privateKey) {
        throw new Exception("Server Error: Private Key not configured.");
    }

    // 2. 入力の取得
    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? '';
    $score = $input['score'] ?? 0;

    if (empty($walletAddress) || !is_numeric($score)) {
        throw new Exception("Invalid input: walletAddress and score are required.");
    }

    // 3. データ整形 (Solidityの abi.encodePacked(address, uint256) と一致させる)
    
    // Address: 0xを除去し、小文字化し、バイナリ(20バイト)に変換
    $addressClean = strtolower(str_replace('0x', '', $walletAddress));
    if (strlen($addressClean) !== 40) {
        throw new Exception("Invalid wallet address format.");
    }
    $addressBin = hex2bin($addressClean);

    // Score: 16進数に変換し、32バイト(64文字)にゼロパディング
    $scoreHex = dechex((int)$score);
    if (strlen($scoreHex) % 2 != 0) {
        $scoreHex = '0' . $scoreHex; // 偶数長にする
    }
    $scoreHex = str_pad($scoreHex, 64, '0', STR_PAD_LEFT);
    $scoreBin = hex2bin($scoreHex);

    // 結合 (Packed)
    $packedData = $addressBin . $scoreBin;

    // 4. ハッシュ化 (Keccak256)
    // Solidity: keccak256(abi.encodePacked(msg.sender, score))
    $hash = Keccak::hash($packedData, 256); // 結果はHex文字列

    // 5. Ethereum Signed Message Prefixの付与
    // Solidity: ECDSA.toEthSignedMessageHash(hash) 相当
    // "\x19Ethereum Signed Message:\n32" + バイナリハッシュ
    $ethMessage = "\x19Ethereum Signed Message:\n32" . hex2bin($hash);
    $ethMessageHash = Keccak::hash($ethMessage, 256); // 署名対象のハッシュ

    // 6. 署名生成 (secp256k1)
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKey);
    
    // canonical: true はEthereumでの標準
    $signature = $key->sign($ethMessageHash, ['canonical' => true]);

    // 7. 署名データの整形 (r, s, v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27); // 27 or 28

    $finalSignature = '0x' . $r . $s . $v;

    echo json_encode([
        'success' => true,
        'signature' => $finalSignature,
        'amount' => $score
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>