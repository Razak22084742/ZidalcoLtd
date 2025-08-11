<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

try {
    // Get feedback with optional limit and status filter
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    $status = isset($_GET['status']) ? $_GET['status'] : null;
    
    $query = "feedback?select=*&order=created_at.desc&limit=$limit";
    
    if ($status) {
        $query .= "&status=eq.$status";
    }
    
    $result = supabaseRequest($query, 'GET');
    
    if ($result['status'] === 200) {
        echo json_encode([
            'success' => true,
            'feedback' => $result['data'],
            'count' => count($result['data'])
        ]);
    } else {
        throw new Exception('Failed to fetch feedback from database');
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
