<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

// Verify admin token
function verifyAdminToken() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';
    
    if (empty($token) || !str_starts_with($token, 'Bearer ')) {
        throw new Exception('Authorization token required');
    }
    
    $token = substr($token, 7); // Remove 'Bearer ' prefix
    
    // Verify token in database
    $result = supabaseRequest('admin_tokens?token=eq.' . urlencode($token) . '&expires_at=gt.' . date('Y-m-d H:i:s'), 'GET');
    
    if ($result['status'] !== 200 || empty($result['data'])) {
        throw new Exception('Invalid or expired token');
    }
    
    return $result['data'][0]['admin_id'];
}

try {
    $admin_id = verifyAdminToken();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($method) {
        case 'GET':
            handleGet($input);
            break;
        case 'POST':
            handlePost($input, $admin_id);
            break;
        case 'PUT':
            handlePut($input, $admin_id);
            break;
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

function handleGet($input) {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'dashboard_stats':
            getDashboardStats();
            break;
        case 'feedback':
            getFeedback($_GET);
            break;
        case 'emails':
            getEmails($_GET);
            break;
        case 'notifications':
            getNotifications();
            break;
        default:
            throw new Exception('Invalid action');
    }
}

function handlePost($input, $admin_id) {
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'reply_feedback':
            replyToFeedback($input, $admin_id);
            break;
        case 'reply_email':
            replyToEmail($input, $admin_id);
            break;
        case 'mark_read':
            markAsRead($input);
            break;
        default:
            throw new Exception('Invalid action');
    }
}

function handlePut($input, $admin_id) {
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'update_feedback_status':
            updateFeedbackStatus($input);
            break;
        case 'update_email_status':
            updateEmailStatus($input);
            break;
        default:
            throw new Exception('Invalid action');
    }
}

function getDashboardStats() {
    // Get counts for dashboard
    $feedback_count = supabaseRequest('feedback?select=count', 'GET');
    $emails_count = supabaseRequest('emails?select=count', 'GET');
    $unread_feedback = supabaseRequest('feedback?is_read=eq.false&select=count', 'GET');
    $unread_emails = supabaseRequest('emails?is_read=eq.false&select=count', 'GET');
    
    echo json_encode([
        'success' => true,
        'stats' => [
            'total_feedback' => $feedback_count['data'][0]['count'] ?? 0,
            'total_emails' => $emails_count['data'][0]['count'] ?? 0,
            'unread_feedback' => $unread_feedback['data'][0]['count'] ?? 0,
            'unread_emails' => $unread_emails['data'][0]['count'] ?? 0
        ]
    ]);
}

function getFeedback($params) {
    $limit = $params['limit'] ?? 50;
    $offset = $params['offset'] ?? 0;
    $status = $params['status'] ?? '';
    
    $query = "feedback?select=*&order=created_at.desc&limit=$limit&offset=$offset";
    
    if ($status) {
        $query .= "&status=eq.$status";
    }
    
    $result = supabaseRequest($query, 'GET');
    
    if ($result['status'] === 200) {
        echo json_encode([
            'success' => true,
            'feedback' => $result['data']
        ]);
    } else {
        throw new Exception('Failed to fetch feedback');
    }
}

function getEmails($params) {
    $limit = $params['limit'] ?? 50;
    $offset = $params['offset'] ?? 0;
    $status = $params['status'] ?? '';
    
    $query = "emails?select=*&order=created_at.desc&limit=$limit&offset=$offset";
    
    if ($status) {
        $query .= "&status=eq.$status";
    }
    
    $result = supabaseRequest($query, 'GET');
    
    if ($result['status'] === 200) {
        echo json_encode([
            'success' => true,
            'emails' => $result['data']
        ]);
    } else {
        throw new Exception('Failed to fetch emails');
    }
}

function getNotifications() {
    // Get recent unread items
    $recent_feedback = supabaseRequest('feedback?is_read=eq.false&order=created_at.desc&limit=10', 'GET');
    $recent_emails = supabaseRequest('emails?is_read=eq.false&order=created_at.desc&limit=10', 'GET');
    
    $notifications = [];
    
    if ($recent_feedback['status'] === 200) {
        foreach ($recent_feedback['data'] as $feedback) {
            $notifications[] = [
                'type' => 'feedback',
                'id' => $feedback['id'],
                'title' => 'New feedback from ' . $feedback['name'],
                'message' => substr($feedback['message'], 0, 100) . '...',
                'time' => $feedback['created_at'],
                'data' => $feedback
            ];
        }
    }
    
    if ($recent_emails['status'] === 200) {
        foreach ($recent_emails['data'] as $email) {
            $notifications[] = [
                'type' => 'email',
                'id' => $email['id'],
                'title' => 'New email from ' . $email['sender_name'],
                'message' => substr($email['message'], 0, 100) . '...',
                'time' => $email['created_at'],
                'data' => $email
            ];
        }
    }
    
    // Sort by time
    usort($notifications, function($a, $b) {
        return strtotime($b['time']) - strtotime($a['time']);
    });
    
    echo json_encode([
        'success' => true,
        'notifications' => array_slice($notifications, 0, 20)
    ]);
}

function replyToFeedback($input, $admin_id) {
    $feedback_id = $input['feedback_id'] ?? '';
    $reply_message = $input['reply_message'] ?? '';
    
    if (empty($feedback_id) || empty($reply_message)) {
        throw new Exception('Feedback ID and reply message are required');
    }
    
    // Get feedback details
    $feedback_result = supabaseRequest('feedback?id=eq.' . $feedback_id, 'GET');
    
    if ($feedback_result['status'] !== 200 || empty($feedback_result['data'])) {
        throw new Exception('Feedback not found');
    }
    
    $feedback = $feedback_result['data'][0];
    
    // Save reply
    $reply_data = [
        'feedback_id' => $feedback_id,
        'admin_id' => $admin_id,
        'reply_message' => htmlspecialchars($reply_message),
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $reply_result = supabaseRequest('feedback_replies', 'POST', $reply_data);
    
    if ($reply_result['status'] >= 200 && $reply_result['status'] < 300) {
        // Mark feedback as replied
        supabaseRequest('feedback?id=eq.' . $feedback_id, 'PATCH', ['status' => 'replied']);
        
        // Send email notification to user (optional)
        sendFeedbackReplyEmail($feedback, $reply_message);
        
        echo json_encode([
            'success' => true,
            'message' => 'Reply sent successfully'
        ]);
    } else {
        throw new Exception('Failed to send reply');
    }
}

function replyToEmail($input, $admin_id) {
    $email_id = $input['email_id'] ?? '';
    $reply_message = $input['reply_message'] ?? '';
    
    if (empty($email_id) || empty($reply_message)) {
        throw new Exception('Email ID and reply message are required');
    }
    
    // Get email details
    $email_result = supabaseRequest('emails?id=eq.' . $email_id, 'GET');
    
    if ($email_result['status'] !== 200 || empty($email_result['data'])) {
        throw new Exception('Email not found');
    }
    
    $email = $email_result['data'][0];
    
    // Save reply
    $reply_data = [
        'email_id' => $email_id,
        'admin_id' => $admin_id,
        'reply_message' => htmlspecialchars($reply_message),
        'created_at' => date('Y-m-d H:i:s')
    ];
    
    $reply_result = supabaseRequest('email_replies', 'POST', $reply_data);
    
    if ($reply_result['status'] >= 200 && $reply_result['status'] < 300) {
        // Mark email as replied
        supabaseRequest('emails?id=eq.' . $email_id, 'PATCH', ['status' => 'replied']);
        
        // Send actual email reply
        sendEmailReply($email, $reply_message);
        
        echo json_encode([
            'success' => true,
            'message' => 'Reply sent successfully'
        ]);
    } else {
        throw new Exception('Failed to send reply');
    }
}

function markAsRead($input) {
    $type = $input['type'] ?? '';
    $id = $input['id'] ?? '';
    
    if (empty($type) || empty($id)) {
        throw new Exception('Type and ID are required');
    }
    
    $table = ($type === 'feedback') ? 'feedback' : 'emails';
    
    $result = supabaseRequest($table . '?id=eq.' . $id, 'PATCH', ['is_read' => true]);
    
    if ($result['status'] >= 200 && $result['status'] < 300) {
        echo json_encode([
            'success' => true,
            'message' => 'Marked as read'
        ]);
    } else {
        throw new Exception('Failed to mark as read');
    }
}

function updateFeedbackStatus($input) {
    $feedback_id = $input['feedback_id'] ?? '';
    $status = $input['status'] ?? '';
    
    if (empty($feedback_id) || empty($status)) {
        throw new Exception('Feedback ID and status are required');
    }
    
    $result = supabaseRequest('feedback?id=eq.' . $feedback_id, 'PATCH', ['status' => $status]);
    
    if ($result['status'] >= 200 && $result['status'] < 300) {
        echo json_encode([
            'success' => true,
            'message' => 'Status updated successfully'
        ]);
    } else {
        throw new Exception('Failed to update status');
    }
}

function updateEmailStatus($input) {
    $email_id = $input['email_id'] ?? '';
    $status = $input['status'] ?? '';
    
    if (empty($email_id) || empty($status)) {
        throw new Exception('Email ID and status are required');
    }
    
    $result = supabaseRequest('emails?id=eq.' . $email_id, 'PATCH', ['status' => $status]);
    
    if ($result['status'] >= 200 && $result['status'] < 300) {
        echo json_encode([
            'success' => true,
            'message' => 'Status updated successfully'
        ]);
    } else {
        throw new Exception('Failed to update status');
    }
}

function sendFeedbackReplyEmail($feedback, $reply_message) {
    // Implementation for sending email notification to user
    // You can use PHPMailer or similar library here
    error_log("Feedback reply sent to: " . $feedback['email']);
}

function sendEmailReply($email, $reply_message) {
    // Implementation for sending email reply to user
    // You can use PHPMailer or similar library here
    error_log("Email reply sent to: " . $email['sender_email']);
}
?>
