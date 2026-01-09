<?php
require 'vendor/autoload.php';

use Dotenv\Dotenv;
use Elliptic\EC;
use kornrunner\Keccak;

// Allow CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

// Get Private Key
$privateKeyHex = $_ENV['PRIVATE_KEY'] ?? null;
if (!$privateKeyHex) {
    http_response_code(500);
    echo JSON_encode(['success' => false, 'message' => 'Server configuration error']);
    exit;
}

// Get Input
$input = json_decode(file_get_contents('php://input'), true);
$walletAddress = $input['walletAddress'] ?? null;
$itemType = $input['itemType'] ?? null;

if (!$walletAddress || !$itemType) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing walletAddress or itemType']);
    exit;
}

try {
    // 1. Prepare Data
    // Remove '0x' prefix
    $walletAddress = str_replace('0x', '', $walletAddress);
    
    // Convert address to binary (20 bytes)
    $addressBin = hex2bin($walletAddress);
    
    // Convert itemType to uint256 binary (32 bytes, Big Endian)
    $itemTypeHex = str_pad(dechex((int)$itemType), 64, '0', STR_PAD_LEFT);
    $itemTypeBin = hex2bin($itemTypeHex);
    
    // 2. Construct Message Hash: keccak256(abi.encodePacked(address, uint256))
    $message = $addressBin . $itemTypeBin;
    $messageHashBin = Keccak::hash($message, 256, true); // Raw binary output
    
    // 3. Construct Ethereum Signed Message
    // Prefix: "\x19Ethereum Signed Message:\n" + length of message (32 bytes)
    $prefix = "\x19Ethereum Signed Message:\n32";
    $ethSignedMessage = $prefix . $messageHashBin;
    
    // Hash again
    $finalHash = Keccak::hash($ethSignedMessage, 256);
    
    // 4. Sign
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKeyHex);
    $signature = $key->sign($finalHash, ['canonical' => true]);
    
    // 5. Format Signature (r + s + v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27);
    
    $fullSignature = '0x' . $r . $s . $v;
    
    echo json_encode([
        'success' => true,
        'signature' => $fullSignature,
        'itemType' => $itemType
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Signing failed: ' . $e->getMessage()]);
}
?>