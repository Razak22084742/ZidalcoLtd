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
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        $input = $_POST;
    }
    
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'login':
            handleLogin($input);
            break;
        case 'signup':
            handleSignup($input);
            break;
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

function handleLogin($input) {
    $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    $password = $input['password'];
    
    if (empty($email) || empty($password)) {
        throw new Exception('Email and password are required');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    // Get admin from Supabase
    $result = supabaseRequest('admins?email=eq.' . urlencode($email), 'GET');
    
    if ($result['status'] !== 200 || empty($result['data'])) {
        throw new Exception('Invalid credentials');
    }
    
    $admin = $result['data'][0];
    
    // Verify password
    if (!password_verify($password, $admin['password'])) {
        throw new Exception('Invalid credentials');
    }
    
    // Create session token
    $token = bin2hex(random_bytes(32));
    $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // Store token in database
    $token_data = [
        'admin_id' => $admin['id'],
        'token' => $token,
        'expires_at' => $expires_at,
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $token_result = supabaseRequest('admin_tokens', 'POST', $token_data);
    
    if ($token_result['status'] >= 200 && $token_result['status'] < 300) {
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
            'admin' => [
                'id' => $admin['id'],
                'name' => $admin['name'],
                'email' => $admin['email'],
                'role' => $admin['role']
            ]
        ]);
    } else {
        throw new Exception('Failed to create session');
    }
}

function handleSignup($input) {
    $name = htmlspecialchars(trim($input['name']));
    $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    $password = $input['password'];
    $confirm_password = $input['confirm_password'];
    
    if (empty($name) || empty($email) || empty($password) || empty($confirm_password)) {
        throw new Exception('All fields are required');
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }
    
    if (strlen($password) < 8) {
        throw new Exception('Password must be at least 8 characters long');
    }
    
    if ($password !== $confirm_password) {
        throw new Exception('Passwords do not match');
    }
    
    // Check if admin already exists
    $existing = supabaseRequest('admins?email=eq.' . urlencode($email), 'GET');
    
    if ($existing['status'] === 200 && !empty($existing['data'])) {
        throw new Exception('Admin with this email already exists');
    }
    
    // Hash password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    // Create admin
    $admin_data = [
        'name' => $name,
        'email' => $email,
        'password' => $hashed_password,
        'role' => 'admin',
        'created_at' => date('Y-m-d H:i:s'),
        'is_active' => true
    ];
    
    $result = supabaseRequest('admins', 'POST', $admin_data);
    
    if ($result['status'] >= 200 && $result['status'] < 300) {
        echo json_encode([
            'success' => true,
            'message' => 'Admin account created successfully'
        ]);
    } else {
        throw new Exception('Failed to create admin account');
    }
}
?>
