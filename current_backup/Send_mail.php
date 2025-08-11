<?php
if($_SERVER["REQUEST_METHOD"] == "POST"){
    // ✅ Your reCAPTCHA Secret Key
    $recaptcha_secret = "YOUR_SECRET_KEY"; // Replace with your actual Secret Key
    $recaptcha_response = $_POST['g-recaptcha-response'];

    // ✅ Verify token with Google
    $verify = file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret={$recaptcha_secret}&response={$recaptcha_response}");
    $captcha_success = json_decode($verify);

    if(!$captcha_success->success || $captcha_success->score < 0.5){
        // Low score or failed verification
        echo "error";
        exit;
    }

    // ✅ Capture form data
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $phone = htmlspecialchars($_POST['phone']);
    $message = htmlspecialchars($_POST['message']);

    // ✅ Email details
    $to = "zidalcoltd@gmail.com"; // Recipient email
    $subject = "New Contact Form Message - Zidalco Website";
    $body = "You have received a new message from the contact form:\n\n".
            "Name: $name\n".
            "Email: $email\n".
            "Phone: $phone\n\n".
            "Message:\n$message";

    $headers = "From: noreply@zidalco.com\r\n";
    $headers .= "Reply-To: $email\r\n";

    // ✅ Send email & redirect to Thank You page
    if(mail($to, $subject, $body, $headers)){
        header("Location: thankyou.html");
        exit;
    } else {
        echo "error";
    }
}
?>