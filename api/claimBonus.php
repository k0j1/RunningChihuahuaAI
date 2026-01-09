<?php
require 'vendor/autoload.php';

use Dotenv\Dotenv;
use Elliptic\EC;
use kornrunner\Keccak;

// CORS headers
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
    echo json_encode(['success' => false, 'message' => 'Server configuration error: Private key missing']);
    exit;
}

// Remove '0x' prefix if present
if (strpos($privateKeyHex, '0x') === 0) {
    $privateKeyHex = substr($privateKeyHex, 2);
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
    // 1. Prepare Data for abi.encodePacked(address, uint256)
    
    // Address: Remove 0x, ensure 40 chars hex
    $walletAddress = str_replace('0x', '', $walletAddress);
    if (strlen($walletAddress) !== 40 || !ctype_xdigit($walletAddress)) {
        throw new Exception("Invalid wallet address format");
    }
    $addressBin = hex2bin($walletAddress);
    
    // ItemType: Convert to uint256 (32 bytes, Big Endian)
    // Ensure it's treated as an integer
    $itemTypeInt = (int)$itemType;
    $itemTypeHex = dechex($itemTypeInt);
    // Pad left with zeros to 64 chars (32 bytes)
    $itemTypeHexPadded = str_pad($itemTypeHex, 64, '0', STR_PAD_LEFT);
    $itemTypeBin = hex2bin($itemTypeHexPadded);
    
    // 2. Construct Message: abi.encodePacked(address, uint256)
    // 20 bytes + 32 bytes = 52 bytes
    $message = $addressBin . $itemTypeBin;
    
    // 3. Hash the message: keccak256(message)
    $messageHashBin = Keccak::hash($message, 256, true);
    
    // 4. Construct Ethereum Signed Message
    // Prefix: "\x19Ethereum Signed Message:\n32"
    // Note: The length is 32 because we are signing the hash of the packed data
    $prefix = "\x19Ethereum Signed Message:\n32";
    $ethSignedMessage = $prefix . $messageHashBin;
    
    // 5. Hash again (Digest)
    $digest = Keccak::hash($ethSignedMessage, 256);
    
    // 6. Sign
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKeyHex);
    $signature = $key->sign($digest, ['canonical' => true]);
    
    // 7. Format Signature (r + s + v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27);
    
    $fullSignature = '0x' . $r . $s . $v;
    
    echo json_encode([
        'success' => true,
        'signature' => $fullSignature,
        'itemType' => $itemTypeInt,
        'debug_address' => '0x' . $walletAddress 
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Signing failed: ' . $e->getMessage()]);
}
?>