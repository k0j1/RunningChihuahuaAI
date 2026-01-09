<?php
// api/claimBonus.php

// CORS Headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use kornrunner\Keccak;
use Elliptic\EC;

// Load Environment Variables
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$privateKey = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');

if (!$privateKey) {
    echo json_encode(['success' => false, 'message' => 'Server configuration error']);
    exit;
}

// Get Request Body
$input = json_decode(file_get_contents('php://input'), true);
$walletAddress = $input['walletAddress'] ?? '';
$itemType = $input['itemType'] ?? 0;

if (!$walletAddress || !$itemType) {
    echo json_encode(['success' => false, 'message' => 'Missing parameters']);
    exit;
}

try {
    // 1. Prepare Data for Hashing
    // Solidity: keccak256(abi.encodePacked(msg.sender, itemType))
    // Note: itemType is uint256
    
    // Address: Remove '0x', ensure lowercase (20 bytes)
    $addressClean = str_replace('0x', '', strtolower($walletAddress));
    
    // ItemType: uint256 is 32 bytes. Convert int to hex and pad left with zeros.
    $itemTypeHex = str_pad(dechex($itemType), 64, '0', STR_PAD_LEFT);
    
    // 2. Create Hash
    // Pack arguments: address (20 bytes) + uint256 (32 bytes)
    $message = hex2bin($addressClean . $itemTypeHex);
    
    // Keccak256 Hash of the packed message
    $hash = Keccak::hash($message, 256); // Returns hex string

    // 3. Sign Hash
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKey);
    
    // Sign the hash (must be hex string for elliptic-php)
    $signature = $key->sign($hash, ['canonical' => true]);

    // 4. Construct Ethereum Signature (r + s + v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    $v = dechex($signature->recoveryParam + 27); // 27 or 28

    $fullSignature = '0x' . $r . $s . $v;

    echo json_encode([
        'success' => true,
        'signature' => $fullSignature,
        'itemType' => $itemType,
        'hash' => '0x' . $hash // Debug info
    ]);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Signing failed: ' . $e->getMessage()]);
}
?>