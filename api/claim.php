<?php
require 'vendor/autoload.php';

use kornrunner\Keccak;
use Elliptic\EC;

// Load .env if present
if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

// Headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Input
$data = json_decode(file_get_contents('php://input'), true);
$walletAddress = $data['walletAddress'] ?? '';
$score = $data['score'] ?? 0;

if (!$walletAddress || $score === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

// Get Private Key from Environment
$privateKeyHex = getenv('PRIVATE_KEY') ?: ($_ENV['PRIVATE_KEY'] ?? '');

if (!$privateKeyHex) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server configuration error']);
    exit;
}

try {
    // 1. Prepare Data
    // Clean address (remove 0x)
    $addressClean = str_replace('0x', '', strtolower($walletAddress));
    
    // Score is used AS IS (raw integer, NO 10^18 multiplication)
    // Convert to hex, pad to 64 chars (32 bytes)
    $scoreHex = str_pad(dechex((int)$score), 64, '0', STR_PAD_LEFT);
    
    // 2. Hash (Keccak256)
    // abi.encodePacked(address, uint256) -> 20 bytes + 32 bytes
    $messageHex = $addressClean . $scoreHex;
    $messageBin = hex2bin($messageHex);
    $hash = Keccak::hash($messageBin, 256);
    
    // 3. Sign (Ethereum Signed Message)
    // hash = keccak256("\x19Ethereum Signed Message:\n32" + hash)
    $hashBin = hex2bin($hash);
    $prefix = "\x19Ethereum Signed Message:\n32";
    $finalMessage = $prefix . $hashBin;
    $finalHash = Keccak::hash($finalMessage, 256);
    
    // EC Sign using secp256k1
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKeyHex);
    $signature = $key->sign($finalHash, ['canonical' => true]);
    
    // Format Signature (r, s, v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27);
    
    $fullSignature = '0x' . $r . $s . $v;
    
    echo json_encode([
        'success' => true,
        'signature' => $fullSignature,
        'adjusted_score' => $score // Return raw score
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}