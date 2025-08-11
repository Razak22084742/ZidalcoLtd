# Zidalco Backend System Setup Guide

## Overview
This guide will help you set up the complete backend system for the Zidalco website, including customer feedback, contact emails, admin authentication, and admin dashboard.

## Prerequisites
- PHP 7.4 or higher with cURL extension enabled
- A web server (Apache, Nginx, or built-in PHP server)
- Supabase account and project

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API key

### 1.2 Set Up Database Tables
1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `supabase_tables.sql`
3. Execute the SQL commands to create all required tables
4. Verify that the tables were created successfully

### 1.3 Update Configuration
1. Open `config/database.php`
2. Replace the placeholder values with your actual Supabase credentials:
   ```php
   define('SUPABASE_URL', 'https://your-project-id.supabase.co');
   define('SUPABASE_KEY', 'your-actual-api-key');
   ```

## Step 2: Web Server Setup

### Option A: Using PHP Built-in Server (Development)
```bash
# Navigate to your project directory
cd /path/to/Zidalco-Touchpoint-main

# Start PHP server
php -S localhost:8000
```

### Option B: Using Apache/Nginx
1. Copy your project to your web server's document root
2. Ensure PHP is properly configured
3. Set appropriate file permissions

### Option C: Using XAMPP/WAMP (Windows)
1. Install XAMPP or WAMP
2. Copy your project to the `htdocs` folder
3. Start Apache service

## Step 3: Testing the System

### 3.1 Test Customer Feedback
1. Open `index.html` in your browser
2. Fill out the feedback form
3. Submit and check if the data appears in your Supabase dashboard

### 3.2 Test Contact Email
1. Open `contact.html` in your browser
2. Fill out the contact form
3. Submit and check if the email record appears in Supabase

### 3.3 Test Admin Dashboard
1. Navigate to `admin/index.html`
2. Use the default admin credentials:
   - Email: `admin@zidalco.com`
   - Password: `admin123`
3. Test all dashboard functionalities

## Step 4: Configuration Files

### 4.1 API Endpoints
All API files are located in the `api/` directory:
- `submit_feedback.php` - Handles customer feedback submission
- `send_email.php` - Handles contact email submission
- `get_feedback.php` - Retrieves feedback data
- `admin_auth.php` - Handles admin login/signup
- `admin_dashboard.php` - Provides admin dashboard data

### 4.2 Admin Dashboard
The admin interface is located in the `admin/` directory:
- `index.html` - Main admin dashboard
- `admin.css` - Dashboard styling
- `admin.js` - Dashboard functionality

## Step 5: Security Considerations

### 5.1 Change Default Admin Password
1. After first login, immediately change the default password
2. Use a strong, unique password

### 5.2 Environment Variables (Production)
For production, consider moving sensitive data to environment variables:
```php
define('SUPABASE_URL', $_ENV['SUPABASE_URL']);
define('SUPABASE_KEY', $_ENV['SUPABASE_KEY']);
```

### 5.3 HTTPS
Ensure your production environment uses HTTPS for secure data transmission.

## Step 6: Troubleshooting

### Common Issues

#### 1. CORS Errors
- Ensure your web server is properly configured
- Check that the API files have the correct CORS headers

#### 2. Database Connection Issues
- Verify your Supabase credentials are correct
- Check that the tables were created successfully
- Ensure your IP is not blocked by Supabase

#### 3. PHP Errors
- Check PHP error logs
- Ensure all required PHP extensions are enabled (especially cURL)
- Verify PHP version compatibility

#### 4. Admin Login Issues
- Check if the admin user was created in the database
- Verify the password hash is correct
- Check browser console for JavaScript errors

### Debug Mode
To enable debug mode, add this to your PHP files:
```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## Step 7: Production Deployment

### 7.1 File Permissions
Set appropriate file permissions:
```bash
chmod 644 *.html *.css *.js
chmod 755 api/ admin/ config/
chmod 644 api/*.php config/*.php
```

### 7.2 Environment Configuration
- Use production Supabase credentials
- Enable HTTPS
- Configure proper error handling
- Set up monitoring and logging

### 7.3 Backup Strategy
- Regular database backups
- File system backups
- Version control for code changes

## API Documentation

### Customer Feedback API
**Endpoint:** `POST /api/submit_feedback.php`
**Body:**
```json
{
    "name": "Customer Name",
    "email": "customer@email.com",
    "phone": "1234567890",
    "message": "Feedback message",
    "type": "general"
}
```

### Contact Email API
**Endpoint:** `POST /api/send_email.php`
**Body:**
```json
{
    "name": "Sender Name",
    "email": "sender@email.com",
    "phone": "1234567890",
    "message": "Email message",
    "recipient_email": "recipient@email.com"
}
```

### Admin Authentication API
**Endpoint:** `POST /api/admin_auth.php`
**Body:**
```json
{
    "action": "login",
    "email": "admin@email.com",
    "password": "password"
}
```

## Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Check the web server error logs
3. Verify all configuration files are correct
4. Ensure all required dependencies are installed

## Default Credentials
- **Admin Email:** admin@zidalco.com
- **Admin Password:** admin123

**⚠️ IMPORTANT:** Change these credentials immediately after first login!
