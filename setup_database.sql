-- Zidalco Backend System Database Setup
-- Run this script in your MySQL database to create the required tables

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS zidalco_db;
USE zidalco_db;

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contact Emails Table
CREATE TABLE IF NOT EXISTS contact_emails (
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
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO admin_users (name, email, password_hash) 
VALUES ('Admin', 'admin@zidalco.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Create indexes for better performance
CREATE INDEX idx_feedback_status ON customer_feedback(status);
CREATE INDEX idx_feedback_created ON customer_feedback(created_at);
CREATE INDEX idx_email_status ON contact_emails(status);
CREATE INDEX idx_email_created ON contact_emails(created_at);
CREATE INDEX idx_admin_email ON admin_users(email);

-- Show created tables
SHOW TABLES;

-- Show table structures
DESCRIBE customer_feedback;
DESCRIBE contact_emails;
DESCRIBE admin_users;

-- Show admin user
SELECT id, name, email, created_at FROM admin_users;
