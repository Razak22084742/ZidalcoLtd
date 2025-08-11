# Zidalco Backend System Documentation

## Overview
This document describes the backend system for the Zidalco website, which includes customer feedback management, email sending, and an admin dashboard.

## System Architecture

### Backend Technologies
- **PHP**: Server-side scripting for API endpoints
- **MySQL**: Database for storing feedback, emails, and admin data
- **Supabase**: Alternative database option (configured but not required)

### Frontend Integration
- **JavaScript**: Fetch API for communicating with backend
- **HTML Forms**: Customer feedback and contact forms
- **CSS**: Styling for forms and message displays

## File Structure

```
Zidalco-Touchpoint-main/
├── api/                          # Backend API endpoints
│   ├── db_config.php            # Database configuration
│   ├── submit_feedback.php      # Submit customer feedback
│   ├── send_email.php           # Send contact emails
│   ├── get_feedback.php         # Retrieve feedback for display
│   ├── admin_auth.php           # Admin authentication
│   └── admin_dashboard.php      # Admin dashboard operations
├── admin/                        # Admin panel
│   ├── index.html               # Admin dashboard interface
│   ├── admin.css                # Admin panel styles
│   └── admin.js                 # Admin panel functionality
├── css/                         # Frontend styles
│   └── Style.css                # Main stylesheet (enhanced)
├── js/                         # Frontend scripts
│   └── script.js                # Main JavaScript (enhanced)
├── index.html                   # Homepage with feedback form
├── contact.html                 # Contact page with email form
├── test_backend.html            # API testing page
└── README_BACKEND.md            # This documentation
```

## Setup Instructions

### 1. Database Setup
The system uses MySQL by default. Create a database and update `api/db_config.php`:

```php
<?php
$host = 'localhost';
$dbname = 'zidalco_db';
$username = 'your_username';
$password = 'your_password';
?>
```

### 2. Database Tables
Run these SQL commands to create the required tables:

```sql
-- Customer Feedback Table
CREATE TABLE customer_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contact Emails Table
CREATE TABLE contact_emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin Users Table
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (name, email, password_hash) 
VALUES ('Admin', 'admin@zidalco.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
```

### 3. Web Server Configuration
Ensure your web server supports PHP and has the required extensions:
- PHP 7.4+ with PDO and MySQL extensions
- mod_rewrite enabled (for clean URLs)

### 4. File Permissions
Make sure the `api/` directory is accessible and PHP files are executable.

## API Endpoints

### 1. Customer Feedback
- **POST** `/api/submit_feedback.php`
  - Accepts: `name`, `message`
  - Returns: JSON response with success status

### 2. Contact Emails
- **POST** `/api/send_email.php`
  - Accepts: `sender_name`, `sender_email`, `sender_phone`, `recipient_email`, `message`
  - Returns: JSON response with success status

### 3. Get Feedback
- **GET** `/api/get_feedback.php`
  - Optional query params: `limit`, `status`
  - Returns: JSON with feedback list

### 4. Admin Authentication
- **POST** `/api/admin_auth.php`
  - Actions: `login`, `signup`
  - Returns: JWT token and admin data

### 5. Admin Dashboard
- **GET/POST** `/api/admin_dashboard.php`
  - Actions: `dashboard_stats`, `feedback`, `emails`, `notifications`, `mark_read`, `reply_feedback`, `reply_email`
  - Requires: Authorization header with JWT token

## Frontend Integration

### 1. Feedback Form (index.html)
The feedback form now submits to the backend API and displays comments from the database.

### 2. Contact Form (contact.html)
The contact form sends emails through the backend API with recipient email selection.

### 3. Message Display System
A toast notification system shows success/error messages for user actions.

## Admin Panel

### Access
- URL: `/admin/`
- Default credentials: `admin@zidalco.com` / `admin123`

### Features
- Dashboard with statistics
- Customer feedback management
- Contact email management
- Reply functionality
- Notification system
- Settings management

## Testing

### 1. Use the Test Page
Open `test_backend.html` to test all API endpoints before going live.

### 2. Check Database
Verify that data is being stored correctly in the database tables.

### 3. Test Admin Panel
Login to the admin panel and verify all functionality works.

## Security Considerations

### 1. Input Validation
All user inputs are validated and sanitized on both frontend and backend.

### 2. SQL Injection Protection
Uses prepared statements with PDO for all database queries.

### 3. Authentication
JWT tokens for admin authentication with proper session management.

### 4. CORS
Configured to allow cross-origin requests for development.

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check database credentials in `api/db_config.php`
   - Ensure MySQL service is running
   - Verify database exists

2. **API Returns 500 Error**
   - Check PHP error logs
   - Verify file permissions
   - Check PHP syntax

3. **Forms Not Submitting**
   - Check browser console for JavaScript errors
   - Verify API endpoints are accessible
   - Check network tab for failed requests

4. **Admin Panel Not Working**
   - Verify admin user exists in database
   - Check JWT token generation
   - Verify admin files are accessible

### Debug Mode
Enable PHP error reporting in development:

```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## Email Configuration

The email sending functionality requires a mail server or SMTP service. For production:

1. Configure PHP mail settings in `php.ini`
2. Set up SMTP credentials if using external service
3. Test email delivery thoroughly

## Future Enhancements

1. **Real-time Notifications**: WebSocket integration for live updates
2. **File Uploads**: Allow customers to attach files to feedback
3. **Advanced Analytics**: Detailed reporting and insights
4. **Multi-language Support**: Internationalization features
5. **API Rate Limiting**: Prevent abuse and spam

## Support

For technical support or questions about the backend system, refer to the code comments or create an issue in the project repository.

---

**Note**: This system is designed for development and testing. For production deployment, ensure proper security measures, SSL certificates, and regular backups are in place.
