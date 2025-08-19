-- Zidalco Backend System - Supabase Table Structure
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
-- Note: You may need to adjust RLS policies based on your security requirements

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'new',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Emails Table
CREATE TABLE IF NOT EXISTS emails (
    id BIGSERIAL PRIMARY KEY,
    sender_name VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'sent',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Session Tokens Table
CREATE TABLE IF NOT EXISTS admin_tokens (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES admins(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback Replies Table
CREATE TABLE IF NOT EXISTS feedback_replies (
    id BIGSERIAL PRIMARY KEY,
    feedback_id BIGINT REFERENCES feedback(id) ON DELETE CASCADE,
    admin_id BIGINT REFERENCES admins(id) ON DELETE CASCADE,
    reply_message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Replies Table
CREATE TABLE IF NOT EXISTS email_replies (
    id BIGSERIAL PRIMARY KEY,
    email_id BIGINT REFERENCES emails(id) ON DELETE CASCADE,
    admin_id BIGINT REFERENCES admins(id) ON DELETE CASCADE,
    reply_message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Content Table (for homepage/services managed content)
CREATE TABLE IF NOT EXISTS contents (
    id BIGSERIAL PRIMARY KEY,
    location VARCHAR(50) NOT NULL,        -- e.g., 'home', 'services'
    slot VARCHAR(100) NOT NULL,           -- e.g., 'announcement', 'home_message', 'services_message'
    title VARCHAR(255) DEFAULT NULL,
    body TEXT DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_created ON emails(created_at);
CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_token ON admin_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_tokens_expires ON admin_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_contents_location ON contents(location);
CREATE INDEX IF NOT EXISTS idx_contents_slot ON contents(slot);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - you may want to customize these)
-- Allow public access to insert feedback and emails
CREATE POLICY "Allow public insert on feedback" ON feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert on emails" ON emails
    FOR INSERT WITH CHECK (true);

-- Allow admins to read all data
CREATE POLICY "Allow admins to read feedback" ON feedback
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to read emails" ON emails
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to read admins" ON admins
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to read admin_tokens" ON admin_tokens
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to read feedback_replies" ON feedback_replies
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to read email_replies" ON email_replies
    FOR SELECT USING (true);

CREATE POLICY "Allow public read contents" ON contents
    FOR SELECT USING (is_published = true AND is_deleted = false);

CREATE POLICY "Allow admins manage contents" ON contents
    FOR ALL USING (true) WITH CHECK (true);

-- Allow admins to update feedback and emails
CREATE POLICY "Allow admins to update feedback" ON feedback
    FOR UPDATE USING (true);

CREATE POLICY "Allow admins to update emails" ON emails
    FOR UPDATE USING (true);

-- Allow admins to insert replies
CREATE POLICY "Allow admins to insert feedback_replies" ON feedback_replies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admins to insert email_replies" ON email_replies
    FOR INSERT WITH CHECK (true);

-- Allow admins to insert admin_tokens
CREATE POLICY "Allow admins to insert admin_tokens" ON admin_tokens
    FOR INSERT WITH CHECK (true);

-- Allow admins to insert new admins
CREATE POLICY "Allow admins to insert admins" ON admins
    FOR INSERT WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON emails
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a default admin user (password: admin123)
-- Note: You should change this password after first login
INSERT INTO admins (name, email, password, role) 
VALUES ('Admin', 'admin@zidalco.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Show created tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('feedback', 'emails', 'admins', 'admin_tokens', 'feedback_replies', 'email_replies');
