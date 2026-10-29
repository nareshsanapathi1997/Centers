-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'admin_credentials', 'password_reset', 'contact_confirmation'
    template_name VARCHAR(255) NOT NULL,
    template_category VARCHAR(50) DEFAULT 'general', -- general, admin, user, notification
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT, -- Plain text version (optional)
    description TEXT,
    
    -- Variable placeholders documentation (JSON)
    variables JSONB, -- e.g., {"username": "Admin username", "password": "Temporary password", ...}
    
    -- Template settings
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false, -- System templates cannot be deleted
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(template_category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);

-- Insert default email templates
INSERT INTO email_templates (template_key, template_name, template_category, subject, html_content, text_content, description, variables, is_system_template) VALUES
(
    'admin_credentials',
    'Admin Account Created',
    'admin',
    'Admin Account Created - {{center_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Admin Account Created</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Admin Account Created</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p>Hello {{admin_name}},</p>
        <p>Your admin account has been created for <strong>{{center_name}}</strong>.</p>
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold; width: 120px;">Username:</td>
                    <td style="padding: 8px 0;">{{username}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Password:</td>
                    <td style="padding: 8px 0;">{{password}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Login URL:</td>
                    <td style="padding: 8px 0;"><a href="{{login_url}}" style="color: #667eea; text-decoration: none;">{{login_url}}</a></td>
                </tr>
            </table>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{login_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login Now</a>
        </div>
        <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
    </div>
</body>
</html>',
    'Hello {{admin_name}},\n\nYour admin account has been created for {{center_name}}.\n\nUsername: {{username}}\nPassword: {{password}}\nLogin URL: {{login_url}}\n\n⚠️ Important: Please change your password after your first login.',
    'Email sent when a new admin account is created',
    '{"admin_name": "Admin full name", "center_name": "Center name", "username": "Admin username", "password": "Temporary password", "login_url": "Admin login URL"}',
    true
),
(
    'password_reset',
    'Password Reset Request',
    'admin',
    'Password Reset Request',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Password Reset Request</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p>Hello {{user_name}},</p>
        <p>We received a request to reset your password for your {{user_type}} account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{reset_url}}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">{{reset_url}}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
    </div>
</body>
</html>',
    'Hello {{user_name}},\n\nWe received a request to reset your password for your {{user_type}} account.\n\nReset your password: {{reset_url}}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.',
    'Email sent when a user requests a password reset',
    '{"user_name": "User full name or username", "user_type": "Admin or Super Admin", "reset_url": "Password reset URL with token"}',
    true
),
(
    'contact_confirmation',
    'Contact Form Confirmation',
    'user',
    'Thank you for contacting {{center_name}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Thank You for Contacting Us</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Thank You!</h1>
    </div>
    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
        <p>Hello {{full_name}},</p>
        <p>Thank you for contacting <strong>{{center_name}}</strong>. We have received your message and will get back to you soon.</p>
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0;"><strong>Your Message:</strong></p>
            <p style="margin: 10px 0 0 0;">{{message}}</p>
        </div>
        <p>We typically respond within 24-48 hours.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">This is an automated confirmation email. Please do not reply to this message.</p>
    </div>
</body>
</html>',
    'Hello {{full_name}},\n\nThank you for contacting {{center_name}}. We have received your message and will get back to you soon.\n\nYour Message:\n{{message}}\n\nWe typically respond within 24-48 hours.',
    'Email sent to users when they submit a contact form',
    '{"full_name": "User full name", "center_name": "Center name", "message": "User message"}',
    true
);
