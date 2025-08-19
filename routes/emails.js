const express = require('express');
const router = express.Router();
const { supabaseRequest } = require('../utils/supabase');
const { sendEmail, sendAdminNotification } = require('../utils/notifications');

// Submit contact email
router.post('/send', async (req, res) => {
  try {
    const { name, email, phone, message, recipient_email } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !message || !recipient_email) {
      return res.status(400).json({
        error: true,
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || !emailRegex.test(recipient_email)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid email format'
      });
    }

    // Prepare email data
    const emailData = {
      sender_name: name.trim(),
      sender_email: email.trim().toLowerCase(),
      sender_phone: phone.trim(),
      message: message.trim(),
      recipient_email: recipient_email.trim().toLowerCase(),
      status: 'sent',
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Store email in database
    const result = await supabaseRequest('emails', 'POST', emailData);

    if (result.status >= 200 && result.status < 300) {
      try {
        // Send actual email
        await sendEmail(emailData);
        
        // Send admin notification
        await sendAdminNotification('email', emailData);

        res.json({
          success: true,
          message: 'Email sent successfully!',
          data: emailData
        });
      } catch (emailError) {
        // Update status to failed
        await supabaseRequest(`emails?id=eq.${result.data[0].id}`, 'PATCH', { status: 'failed' });
        
        throw new Error('Failed to send email: ' + emailError.message);
      }
    } else {
      throw new Error(`Failed to save email record: ${JSON.stringify(result.data)}`);
    }

  } catch (error) {
    console.error('Email submission error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to send email'
    });
  }
});

// Get emails (admin only)
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    
    let query = `emails?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    if (status) {
      query += `&status=eq.${status}`;
    }

    const result = await supabaseRequest(query, 'GET');

    if (result.status === 200) {
      res.json({
        success: true,
        emails: result.data,
        count: result.data.length
      });
    } else {
      throw new Error('Failed to fetch emails');
    }

  } catch (error) {
    console.error('Get emails error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to fetch emails'
    });
  }
});

// Get email by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await supabaseRequest(`emails?id=eq.${id}`, 'GET');

    if (result.status === 200 && result.data.length > 0) {
      res.json({
        success: true,
        email: result.data[0]
      });
    } else {
      res.status(404).json({
        error: true,
        message: 'Email not found'
      });
    }

  } catch (error) {
    console.error('Get email by ID error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to fetch email'
    });
  }
});

// DELETE /api/emails/:id (admin via admin router, but allow here too if needed)
// NOTE: Deletion of emails is handled in protected admin routes

// Update email status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: true,
        message: 'Status is required'
      });
    }

    const result = await supabaseRequest(`emails?id=eq.${id}`, 'PATCH', { status });

    if (result.status >= 200 && result.status < 300) {
      res.json({
        success: true,
        message: 'Status updated successfully'
      });
    } else {
      throw new Error('Failed to update status');
    }

  } catch (error) {
    console.error('Update email status error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to update status'
    });
  }
});

// Mark email as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await supabaseRequest(`emails?id=eq.${id}`, 'PATCH', { is_read: true });

    if (result.status >= 200 && result.status < 300) {
      res.json({
        success: true,
        message: 'Marked as read'
      });
    } else {
      throw new Error('Failed to mark as read');
    }

  } catch (error) {
    console.error('Mark email as read error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to mark as read'
    });
  }
});

// Resend email
router.post('/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get email details
    const emailResult = await supabaseRequest(`emails?id=eq.${id}`, 'GET');
    
    if (emailResult.status !== 200 || emailResult.data.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'Email not found'
      });
    }

    const emailData = emailResult.data[0];

    // Try to resend email
    await sendEmail(emailData);
    
    // Update status to sent
    await supabaseRequest(`emails?id=eq.${id}`, 'PATCH', { 
      status: 'sent',
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Email resent successfully'
    });

  } catch (error) {
    console.error('Resend email error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to resend email'
    });
  }
});

module.exports = router;
