<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    // Validate required fields
    $required_fields = ['name', 'email', 'phone', 'message'];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }
    
    // Sanitize input
    $name = htmlspecialchars(trim($input['name']));
    $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    $phone = htmlspecialchars(trim($input['phone']));
    $message = htmlspecialchars(trim($input['message']));
    $type = isset($input['type']) ? htmlspecialchars(trim($input['type'])) : 'general';
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Prepare data for Supabase
    $feedback_data = [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'message' => $message,
        'type' => $type,
        'status' => 'new',
        'created_at' => date('Y-m-d H:i:s'),
        'is_read' => false
    ];
    
    // Insert into Supabase
    $result = supabaseRequest('feedback', 'POST', $feedback_data);
    
    if ($result['status'] >= 200 && $result['status'] < 300) {
        // Send notification email to admin (optional)
        sendAdminNotification($feedback_data);
        
        echo json_encode([
            'success' => true,
            'message' => 'Feedback submitted successfully!',
            'data' => $feedback_data
        ]);
    } else {
        throw new Exception('Failed to save feedback: ' . json_encode($result['data']));
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

function sendAdminNotification($feedback_data) {
    // You can implement email notification here
    // For now, we'll just log it
    error_log("New feedback received from: " . $feedback_data['email']);
}
?>
