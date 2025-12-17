<?php
// api/claim.php

// CORS Headers (Webアプリからのアクセスを許可)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Preflightリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// オートローダーの読み込み（ローカル環境と本番環境のパスの違いを吸収）
$vendorPath = __DIR__ . '/../vendor/autoload.php'; // ローカル開発用
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    $vendorPath = __DIR__ . '/vendor/autoload.php'; // デプロイ環境用
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
    // 親ディレクトリ（ローカル）またはカレントディレクトリ（本番）を探す
    if (file_exists(__DIR__ . '/../.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__ . '/../');
        $dotenv->load();
    } elseif (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
    }

    // 環境変数から秘密鍵を取得
    $privateKeyHex = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');

    if (!$privateKeyHex) {
        throw new Exception('Server configuration error: Private Key not found.');
    }

    // リクエストボディの取得
    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? '';
    $score = $input['score'] ?? 0;

    // 入力バリデーション
    if (!$walletAddress || !is_numeric($score)) {
        throw new Exception('Invalid input: walletAddress and score are required.');
    }

    // --- 1. データパッキング (Solidityの abi.encodePacked 相当) ---
    
    // ウォレットアドレスから '0x' を除去してバイナリに変換 (20バイト)
    $addrHex = str_replace('0x', '', $walletAddress);
    if (strlen($addrHex) !== 40) {
        throw new Exception('Invalid wallet address format.');
    }
    
    // スコアをUint256形式（64文字の16進数、ビッグエンディアン）に変換
    $scoreHex = str_pad(dechex((int)$score), 64, '0', STR_PAD_LEFT);
    
    // 結合 (Address + Score)
    $packedData = hex2bin($addrHex) . hex2bin($scoreHex);

    // --- 2. ハッシュ化 (Keccak256) ---
    $messageHash = Keccak::hash($packedData, true); // バイナリ形式で出力

    // --- 3. Ethereum署名用プレフィックスの付与 ---
    // "\x19Ethereum Signed Message:\n32" + hash
    $prefix = "\x19Ethereum Signed Message:\n32";
    $prefixedMessage = $prefix . $messageHash;
    
    // プレフィックス付きデータを再度ハッシュ化
    $finalHash = Keccak::hash($prefixedMessage, true); // バイナリ形式

    // --- 4. 署名 (Secp256k1) ---
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKeyHex);
    
    // ハッシュを署名 (Canonicalオプションを有効化)
    $signature = $key->sign(bin2hex($finalHash), ['canonical' => true]);
    
    // R, S, V の取得と整形
    $r = $signature->r->toString(16);
    $s = $signature->s->toString(16);
    $v = $signature->recoveryParam + 27; // EthereumのVは 27 または 28

    // 64文字になるようにゼロ埋め
    $r = str_pad($r, 64, '0', STR_PAD_LEFT);
    $s = str_pad($s, 64, '0', STR_PAD_LEFT);
    $v = dechex($v);

    // 結合して署名文字列を作成 (0x + R + S + V)
    $fullSignature = '0x' . $r . $s . $v;

    // レスポンス返却
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