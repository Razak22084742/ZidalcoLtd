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
    $required_fields = ['name', 'email', 'phone', 'message', 'recipient_email'];
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
    $recipient_email = filter_var(trim($input['recipient_email']), FILTER_SANITIZE_EMAIL);
    
    // Validate emails
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid sender email format');
    }
    
    if (!filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid recipient email format');
    }
    
    // Store email in database for admin tracking
    $email_data = [
        'sender_name' => $name,
        'sender_email' => $email,
        'sender_phone' => $phone,
        'message' => $message,
        'recipient_email' => $recipient_email,
        'status' => 'sent',
        'created_at' => date('Y-m-d H:i:s'),
        'is_read' => false
    ];
    
    // Save to Supabase
    $result = supabaseRequest('emails', 'POST', $email_data);
    
    if ($result['status'] >= 200 && $result['status'] < 300) {
        // Send actual email using PHP mail function
        $email_sent = sendEmail($name, $email, $phone, $message, $recipient_email);
        
        if ($email_sent) {
            echo json_encode([
                'success' => true,
                'message' => 'Email sent successfully!',
                'data' => $email_data
            ]);
        } else {
            // Update status to failed
            supabaseRequest('emails?id=eq.' . $result['data']['id'], 'PATCH', ['status' => 'failed']);
            
            throw new Exception('Failed to send email');
        }
    } else {
        throw new Exception('Failed to save email record: ' . json_encode($result['data']));
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage()
    ]);
}

function sendEmail($name, $email, $phone, $message, $recipient_email) {
    $subject = "New Message from Zidalco Website - $name";
    
    $headers = [
        'From: ' . $email,
        'Reply-To: ' . $email,
        'X-Mailer: PHP/' . phpversion(),
        'Content-Type: text/html; charset=UTF-8'
    ];
    
    $email_body = "
    <html>
    <head>
        <title>New Contact Message</title>
    </head>
    <body>
        <h2>New Message from Zidalco Website</h2>
        <p><strong>Name:</strong> $name</p>
        <p><strong>Email:</strong> $email</p>
        <p><strong>Phone:</strong> $phone</p>
        <p><strong>Message:</strong></p>
        <p>" . nl2br($message) . "</p>
        <hr>
        <p><em>This message was sent from the Zidalco Company Limited website contact form.</em></p>
    </body>
    </html>
    ";
    
    // Try to send email
    $mail_sent = mail($recipient_email, $subject, $email_body, implode("\r\n", $headers));
    
    // If mail() fails, try alternative method (you might want to use PHPMailer or similar)
    if (!$mail_sent) {
        // Log the attempt
        error_log("Failed to send email from $email to $recipient_email");
        return false;
    }
    
    return true;
}
?>
