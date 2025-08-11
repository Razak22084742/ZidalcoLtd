<?php
// Test configuration file
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test if we can include the database config
try {
    require_once 'config/database.php';
    
    // Test basic Supabase connection
    $test_result = supabaseRequest('feedback?select=count', 'GET');
    
    echo json_encode([
        'success' => true,
        'message' => 'Configuration loaded successfully',
        'supabase_url' => SUPABASE_URL,
        'test_result' => $test_result,
        'php_version' => PHP_VERSION,
        'curl_enabled' => function_exists('curl_init')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'php_version' => PHP_VERSION,
        'curl_enabled' => function_exists('curl_init')
    ]);
}
?>
