<?php
// api/claim.php

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json');

// Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use Elliptic\EC;
use kornrunner\Keccak;

try {
    // 1. Load Environment Variables
    if (file_exists(__DIR__ . '/.env')) {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();
    }

    $privateKey = $_ENV['PRIVATE_KEY'] ?? getenv('PRIVATE_KEY');
    if (!$privateKey) {
        throw new Exception("Server configuration error: Private Key not found.");
    }

    // 2. Get Input
    $input = json_decode(file_get_contents('php://input'), true);
    $walletAddress = $input['walletAddress'] ?? '';
    $score = $input['score'] ?? 0;

    if (empty($walletAddress) || !is_numeric($score)) {
        throw new Exception("Invalid input: walletAddress and score are required.");
    }

    // 3. Prepare Data for Signing (Must match Solidity abi.encodePacked)
    
    // Address: Remove '0x', ensure lowercase, convert to binary (20 bytes)
    $addressClean = strtolower(str_replace('0x', '', $walletAddress));
    if (strlen($addressClean) !== 40) {
        throw new Exception("Invalid wallet address length.");
    }
    $addressBin = hex2bin($addressClean);

    // Score: Convert to hex, pad to 32 bytes (64 hex chars), convert to binary
    // Note: dechex handles standard integers. For very large numbers, consider using BCMath.
    $scoreHex = dechex((int)$score);
    if (strlen($scoreHex) % 2 != 0) {
        $scoreHex = '0' . $scoreHex; // Ensure even length
    }
    $scoreHex = str_pad($scoreHex, 64, '0', STR_PAD_LEFT);
    $scoreBin = hex2bin($scoreHex);

    // Pack: Address (20 bytes) + Score (32 bytes)
    $packedData = $addressBin . $scoreBin;

    // 4. Hash (Keccak256)
    $hash = Keccak::hash($packedData, 256);

    // 5. Sign with EIP-191 Prefix ("\x19Ethereum Signed Message:\n32")
    // This is required because Solidity's ECDSA.recover expects this prefix by default
    // or typically contracts use `toEthSignedMessageHash` on the hash.
    $ethMessage = "\x19Ethereum Signed Message:\n32" . hex2bin($hash);
    $ethMessageHash = Keccak::hash($ethMessage, 256);

    // 6. Generate Signature using Elliptic Curve (secp256k1)
    $ec = new EC('secp256k1');
    $key = $ec->keyFromPrivate($privateKey);
    
    // Sign the hash
    $signature = $key->sign($ethMessageHash, ['canonical' => true]);

    // 7. Format Signature (r + s + v)
    $r = str_pad($signature->r->toString(16), 64, '0', STR_PAD_LEFT);
    $s = str_pad($signature->s->toString(16), 64, '0', STR_PAD_LEFT);
    // recoveryParam is 0 or 1. Add 27 to get standard v (27 or 28)
    $v = dechex($signature->recoveryParam + 27);

    $finalSignature = '0x' . $r . $s . $v;

    echo json_encode([
        'success' => true,
        'signature' => $finalSignature,
        'debug_score' => $score,
        'debug_address' => $walletAddress
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>