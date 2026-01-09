<?php
// 必要なライブラリ: kornrunner/keccak, simplito/elliptic-php, vlucas/phpdotenv
// composer require kornrunner/keccak simplito/elliptic-php vlucas/phpdotenv

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Elliptic\EC;
use kornrunner\Keccak;

// .envの読み込み（サーバー環境変数で設定されている場合はスキップ可）
$dotenv = Dotenv::createImmutable(__DIR__);
try {
    $dotenv->load();
} catch (Exception $e) {
    // .envが見つからない場合は環境変数を直接参照
}

$privateKeyHex = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');

if (!$privateKeyHex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server configuration error: Private Key missing']);
    exit;
}

// ヘルパー関数: 0xプレフィックスの除去
function strip0x($str) {
    return (strpos($str, '0x') === 0) ? substr($str, 2) : $str;
}

// 1. 入力データの取得
$input = json_decode(file_get_contents('php://input'), true);
$walletAddress = $input['walletAddress'] ?? '';
$itemType = $input['itemType'] ?? 0;

if (!$walletAddress || !$itemType) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters: walletAddress or itemType']);
    exit;
}

try {
    // 2. データのパッキング (Solidityの abi.encodePacked と同じ形式)
    
    // Address: 20バイト (バイナリ)
    $addressHex = strip0x($walletAddress);
    if (strlen($addressHex) !== 40) {
        throw new Exception("Invalid wallet address length");
    }
    $addressBin = hex2bin($addressHex);

    // Uint256: 32バイト (ビッグエンディアン, バイナリ)
    // $itemTypeは整数のため、16進数に変換し、64文字(32バイト)になるよう左側を0埋め
    $itemTypeHex = str_pad(dechex($itemType), 64, '0', STR_PAD_LEFT);
    $itemTypeBin = hex2bin($itemTypeHex);

    // 結合
    $packed = $addressBin . $itemTypeBin;

    // 3. データハッシュの生成 (Keccak256)
    $dataHashHex = Keccak::hash($packed, 256);
    $dataHashBin = hex2bin($dataHashHex);

    // 4. EIP-191 プレフィックスの付与と再ハッシュ
    // "\x19Ethereum Signed Message:\n32" + dataHash
    // これにより、ethers.jsなどの wallet.signMessage と同じ署名が生成され、
    // スマートコントラクトの ECDSA.recover で復元可能になります。
    $prefix = "\x19Ethereum Signed Message:\n32";
    $finalHashHex = Keccak::hash($prefix . $dataHashBin, 256);
    
    // 5. 署名の生成
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate(strip0x($privateKeyHex));
    $signature = $key->sign($finalHashHex, ['canonical' => true]);

    // 6. 署名文字列の構築 (r + s + v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27); // Ethereumの標準的なv値 (27 or 28)

    $fullSignature = '0x' . $r . $s . $v;

    echo json_encode([
        'success' => true,
        'signature' => $fullSignature,
        'debug' => [
            'itemType' => $itemType,
            'wallet' => $walletAddress
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>