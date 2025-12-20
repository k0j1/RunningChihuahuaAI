<?php
// api/claim.php

// 1. CORSヘッダーの設定
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// プリフライトリクエスト（OPTIONS）の処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use kornrunner\Keccak;
use Elliptic\EC;

try {
    // 2. 環境変数の読み込み (.envファイル)
    if (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
    }

    // 秘密鍵（0xB6eD...に対応するもの）を取得
    $privateKey = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');
    if (!$privateKey) {
        throw new Exception("Server Error: Private Key not configured.");
    }
    // 0xがついている場合は除去
    $privateKey = str_replace('0x', '', $privateKey);

    // 3. POSTデータの取得とバリデーション
    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? '';
    $score = $input['score'] ?? 0;

    if (empty($walletAddress) || !is_numeric($score)) {
        throw new Exception("Invalid input: walletAddress and score are required.");
    }

    // スコアがコントラクトの上限(60,000)を超えていないかサーバー側でも簡易チェック
    if ($score > 60000) {
        throw new Exception("Invalid score: Exceeds maximum limit.");
    }

    // 4. データ整形 (Solidity: abi.encodePacked(msg.sender, score) の再現)
    
    // Address (20バイト): 0xを除去し小文字化してバイナリ変換
    $addressClean = strtolower(str_replace('0x', '', $walletAddress));
    if (strlen($addressClean) !== 40) {
        throw new Exception("Invalid wallet address format.");
    }
    $addressBin = hex2bin($addressClean);

    // Score (32バイト): uint256として32バイト(64文字)にゼロパディング
    $scoreHex = str_pad(dechex((int)$score), 64, '0', STR_PAD_LEFT);
    $scoreBin = hex2bin($scoreHex);

    // 5. 二重ハッシュ処理 (Ethereum Signed Message形式)
    
    // Step 1: データの結合と一次ハッシュ
    $packedData = $addressBin . $scoreBin;
    $rawHash = Keccak::hash($packedData, 256);

    // Step 2: Ethereum Prefixの付与 (Solidityの toEthSignedMessageHash 相当)
    // "\x19Ethereum Signed Message:\n32" + バイナリ化した一次ハッシュ
    $ethMessage = "\x19Ethereum Signed Message:\n32" . hex2bin($rawHash);
    $ethMessageHash = Keccak::hash($ethMessage, 256);

    // 6. 署名生成 (secp256k1)
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKey);
    
    // signメソッドで署名(r, s, v)を取得
    $signatureObj = $key->sign($ethMessageHash, ['canonical' => true]);

    // 7. 署名データの整形 (65バイトのHex文字列)
    $r = str_pad($signatureObj->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signatureObj->s->toString(16), 64, '0', STR_PAD_LEFT);
    
    // Ethereumのリカバリパラメータ v は 27 または 28
    $v = dechex($signatureObj->recoveryParam + 27);

    $finalSignature = '0x' . $r . $s . $v;

    // 8. レスポンスの返却
    echo json_encode([
        'success' => true,
        'signature' => $finalSignature,
        'score' => (int)$score,
        'walletAddress' => $walletAddress
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}