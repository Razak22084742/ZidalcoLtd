const express = require('express');
const router = express.Router();
const { supabaseRequest } = require('../utils/supabase');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/notifications');

// All routes here require Supabase auth
router.use(authMiddleware);

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [feedbackCount, emailsCount, unreadFeedback, unreadEmails] = await Promise.all([
      supabaseRequest('feedback?select=count', 'GET'),
      supabaseRequest('emails?select=count', 'GET'),
      supabaseRequest('feedback?is_read=eq.false&select=count', 'GET'),
      supabaseRequest('emails?is_read=eq.false&select=count', 'GET')
    ]);

    res.json({
      success: true,
      stats: {
        total_feedback: feedbackCount.data?.[0]?.count || 0,
        total_emails: emailsCount.data?.[0]?.count || 0,
        unread_feedback: unreadFeedback.data?.[0]?.count || 0,
        unread_emails: unreadEmails.data?.[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: true, message: 'Failed to load dashboard stats' });
  }
});

// GET /api/admin/notifications
router.get('/notifications', async (req, res) => {
  try {
    const [recentFeedback, recentEmails] = await Promise.all([
      supabaseRequest('feedback?is_read=eq.false&order=created_at.desc&limit=10', 'GET'),
      supabaseRequest('emails?is_read=eq.false&order=created_at.desc&limit=10', 'GET')
    ]);

    const notifications = [];

    if (recentFeedback.status === 200) {
      for (const fb of recentFeedback.data) {
        notifications.push({
          type: 'feedback',
          id: fb.id,
          title: `New feedback from ${fb.name}`,
          message: `${String(fb.message).slice(0, 100)}...`,
          time: fb.created_at,
          data: fb
        });
      }
    }

    if (recentEmails.status === 200) {
      for (const em of recentEmails.data) {
        notifications.push({
          type: 'email',
          id: em.id,
          title: `New email from ${em.sender_name}`,
          message: `${String(em.message).slice(0, 100)}...`,
          time: em.created_at,
          data: em
        });
      }
    }

    notifications.sort((a,b) => new Date(b.time) - new Date(a.time));

    res.json({ success: true, notifications: notifications.slice(0, 20) });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: true, message: 'Failed to load notifications' });
  }
});

// POST /api/admin/reply-feedback
router.post('/reply-feedback', async (req, res) => {
  try {
    const { feedback_id, reply_message } = req.body;
    if (!feedback_id || !reply_message) {
      return res.status(400).json({ error: true, message: 'Feedback ID and reply message are required' });
    }

    const feedback = await supabaseRequest(`feedback?id=eq.${feedback_id}`, 'GET');
    if (feedback.status !== 200 || !Array.isArray(feedback.data) || feedback.data.length === 0) {
      return res.status(404).json({ error: true, message: 'Feedback not found' });
    }

    const replyData = {
      feedback_id,
      admin_id: null,
      reply_message,
      created_at: new Date().toISOString()
    };

    const save = await supabaseRequest('feedback_replies', 'POST', replyData);
    if (save.status < 200 || save.status >= 300) {
      return res.status(500).json({ error: true, message: 'Failed to save reply' });
    }

    await supabaseRequest(`feedback?id=eq.${feedback_id}`, 'PATCH', { status: 'replied' });

    // Optional: email to user could be sent here via SMTP if desired

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply feedback error:', error);
    res.status(500).json({ error: true, message: 'Failed to send reply' });
  }
});

// POST /api/admin/reply-email
router.post('/reply-email', async (req, res) => {
  try {
    const { email_id, reply_message } = req.body;
    if (!email_id || !reply_message) {
      return res.status(400).json({ error: true, message: 'Email ID and reply message are required' });
    }

    const emailRes = await supabaseRequest(`emails?id=eq.${email_id}`, 'GET');
    if (emailRes.status !== 200 || !Array.isArray(emailRes.data) || emailRes.data.length === 0) {
      return res.status(404).json({ error: true, message: 'Email not found' });
    }

    const replyData = {
      email_id,
      admin_id: null,
      reply_message,
      created_at: new Date().toISOString()
    };

    const save = await supabaseRequest('email_replies', 'POST', replyData);
    if (save.status < 200 || save.status >= 300) {
      return res.status(500).json({ error: true, message: 'Failed to save reply' });
    }

    await supabaseRequest(`emails?id=eq.${email_id}`, 'PATCH', { status: 'replied' });

    // Optional: actually send email reply using SMTP here (to sender_email)
    const emailData = emailRes.data[0];
    try {
      await sendEmail({
        sender_name: 'Zidalco Admin',
        sender_email: process.env.SMTP_FROM || 'no-reply@zidalco.com',
        sender_phone: '',
        message: reply_message,
        recipient_email: emailData.sender_email
      });
    } catch (_) {}

    res.json({ success: true, message: 'Reply sent successfully' });
  } catch (error) {
    console.error('Reply email error:', error);
    res.status(500).json({ error: true, message: 'Failed to send reply' });
  }
});

// POST /api/admin/mark-read
router.post('/mark-read', async (req, res) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) {
      return res.status(400).json({ error: true, message: 'Type and ID are required' });
    }

    const table = type === 'feedback' ? 'feedback' : 'emails';
    const result = await supabaseRequest(`${table}?id=eq.${id}`, 'PATCH', { is_read: true });
    if (result.status >= 200 && result.status < 300) {
      res.json({ success: true, message: 'Marked as read' });
    } else {
      res.status(500).json({ error: true, message: 'Failed to mark as read' });
    }
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: true, message: 'Failed to mark as read' });
  }
});

// POST /api/admin/mark-all-read
router.post('/mark-all-read', async (req, res) => {
  try {
    const [f, e] = await Promise.all([
      supabaseRequest('feedback?is_read=eq.false', 'PATCH', { is_read: true }),
      supabaseRequest('emails?is_read=eq.false', 'PATCH', { is_read: true })
    ]);
    if ((f.status >= 200 && f.status < 300) && (e.status >= 200 && e.status < 300)) {
      return res.json({ success: true, message: 'All notifications marked as read' });
    }
    return res.status(500).json({ error: true, message: 'Failed to mark all as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: true, message: 'Failed to mark all as read' });
  }
});

// GET /api/admin/feedback
router.get('/feedback', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    let query = `feedback?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (status) query += `&status=eq.${status}`;
    const result = await supabaseRequest(query, 'GET');
    if (result.status === 200) {
      res.json({ success: true, feedback: result.data });
    } else {
      res.status(500).json({ error: true, message: 'Failed to fetch feedback' });
    }
  } catch (error) {
    console.error('Admin list feedback error:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch feedback' });
  }
});

// GET /api/admin/feedback/:id
router.get('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supabaseRequest(`feedback?id=eq.${id}`, 'GET');
    if (result.status === 200 && Array.isArray(result.data) && result.data.length > 0) {
      res.json({ success: true, feedback: result.data[0] });
    } else {
      res.status(404).json({ error: true, message: 'Feedback not found' });
    }
  } catch (error) {
    console.error('Admin get feedback by ID error:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch feedback' });
  }
});

// DELETE /api/admin/feedback/:id (soft delete)
router.delete('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: true, message: 'Feedback ID is required' });
    }

    const result = await supabaseRequest(`feedback?id=eq.${id}`, 'PATCH', { status: 'deleted', is_read: true });
    if (result.status >= 200 && result.status < 300) {
      return res.json({ success: true, message: 'Feedback removed' });
    }

    return res.status(500).json({ error: true, message: 'Failed to remove feedback' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({ error: true, message: 'Failed to remove feedback' });
  }
});

// GET /api/admin/emails
router.get('/emails', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    let query = `emails?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (status) query += `&status=eq.${status}`;
    const result = await supabaseRequest(query, 'GET');
    if (result.status === 200) {
      res.json({ success: true, emails: result.data });
    } else {
      res.status(500).json({ error: true, message: 'Failed to fetch emails' });
    }
  } catch (error) {
    console.error('Admin list emails error:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch emails' });
  }
});

// GET /api/admin/emails/:id
router.get('/emails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supabaseRequest(`emails?id=eq.${id}`, 'GET');
    if (result.status === 200 && Array.isArray(result.data) && result.data.length > 0) {
      res.json({ success: true, emails: result.data[0] });
    } else {
      res.status(404).json({ error: true, message: 'Email not found' });
    }
  } catch (error) {
    console.error('Admin get email by ID error:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch email' });
  }
});

module.exports = router;
