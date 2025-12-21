<?php
require 'vendor/autoload.php';

use Elliptic\EC;
use kornrunner\Keccak;
use Dotenv\Dotenv;

// CORSヘッダー設定
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// プリフライトリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // .env の読み込み
    $dotenv = Dotenv::createImmutable(__DIR__);
    // 開発環境と本番環境でパスが異なる場合のエラー抑制
    try {
        $dotenv->load();
    } catch (Exception $e) {
        // .envが見つからない場合は環境変数を直接参照（本番環境など）
    }

    $privateKey = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');

    if (!$privateKey) {
        throw new Exception("Server configuration error: Private Key missing.");
    }

    // 入力データの取得
    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? '';
    $score = $input['score'] ?? 0;

    if (!$walletAddress || !isset($score)) {
        throw new Exception("Invalid input: walletAddress or score missing.");
    }

    // 1. スコアをWei単位（10^18倍）に変換
    // 大きな数値を扱うため bcmath を使用
    $adjustedScore = bcmul((string)$score, '1000000000000000000');

    // 2. 引数のパッキング (Solidity: abi.encodePacked(address, uint256))
    
    // アドレスの処理: 0xを除去してバイナリ化
    $addressBin = hex2bin(substr(strtolower($walletAddress), 2));

    // 数値(uint256)の処理: 10進数文字列を16進数に変換
    $scoreHex = '';
    $current = $adjustedScore;
    if ($current == '0') {
        $scoreHex = '00';
    } else {
        while (bccomp($current, '0') > 0) {
            $mod = bcmod($current, '16');
            $scoreHex = dechex((int)$mod) . $scoreHex;
            $current = bcdiv($current, '16', 0);
        }
    }
    
    // 32バイト（64文字）になるように左側を0埋め
    $scoreHex = str_pad($scoreHex, 64, '0', STR_PAD_LEFT);
    $scoreBin = hex2bin($scoreHex);

    // バイナリ連結
    $packed = $addressBin . $scoreBin;

    // --- 3. ハッシュ化 (Keccak256) ---
    // まず、データそのもののハッシュを作成 (Solidityのkeccak256(abi.encodePacked(...))に相当)
    $messageHash = Keccak::hash($packed, 256);
    
    // 次に、イーサリアムの標準プレフィックスを付けて再度ハッシュ化
    // これが Solidity の toEthSignedMessageHash() に対応します
    $prefix = "\x19Ethereum Signed Message:\n32";
    $ethSignedHash = Keccak::hash($prefix . hex2bin($messageHash), 256);

    // --- 4. 署名 (Secp256k1) ---
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKey);
    
    // プレフィックス付きのハッシュに対して署名を行う
    $signatureObj = $key->sign($ethSignedHash, ['canonical' => true]);

    // r, s, v の形式に整形
    $r = str_pad($signatureObj->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signatureObj->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signatureObj->recoveryParam + 27);

    $signature = '0x' . $r . $s . $v;

    // フロントエンドに署名と調整済みスコアを返す
    echo json_encode([
        'success' => true,
        'message' => 'Signature generated.',
        'signature' => $signature,
        'adjusted_score' => $adjustedScore
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>