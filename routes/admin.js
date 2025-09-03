const express = require('express');
const router = express.Router();
const { supabaseRequest } = require('../utils/supabase');
const { authMiddleware } = require('../middleware/auth');
const { sendEmail } = require('../utils/notifications');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');

// Upload storage (use OS temp dir for Vercel/serverless)
const uploadsDir = path.join(os.tmpdir(), 'zidalco-uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}
}
const storage = multer.diskStorage({
  destination: function(_req, _file, cb) { cb(null, uploadsDir); },
  filename: function(_req, file, cb) {
    const ext = path.extname(file.originalname) || '';
    const safe = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
    cb(null, safe);
  }
});
const upload = multer({ storage });

// All routes here require Supabase auth
router.use(authMiddleware);

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [feedbackCount, emailsCount, unreadFeedback, unreadEmails] = await Promise.all([
      supabaseRequest('feedback?status=neq.deleted&select=count', 'GET'),
      supabaseRequest('emails?status=neq.deleted&select=count', 'GET'),
      supabaseRequest('feedback?is_read=eq.false&status=neq.deleted&select=count', 'GET'),
      supabaseRequest('emails?is_read=eq.false&status=neq.deleted&select=count', 'GET')
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
      supabaseRequest('feedback?is_read=eq.false&status=neq.deleted&order=created_at.desc&limit=10', 'GET'),
      supabaseRequest('emails?is_read=eq.false&status=neq.deleted&order=created_at.desc&limit=10', 'GET')
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
    if (status) {
      query += `&status=eq.${status}`;
    } else {
      query += `&status=neq.deleted`;
    }
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

// DELETE /api/admin/feedback/:id (permanent delete)
router.delete('/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: true, message: 'Feedback ID is required' });
    }

    let result = await supabaseRequest(`feedback?id=eq.${id}`, 'DELETE');
    if (result.status >= 200 && result.status < 300) {
      return res.json({ success: true, message: 'Feedback permanently removed' });
    }
    // Fallback to soft-delete so it disappears from UI even if permanent delete is blocked
    result = await supabaseRequest(`feedback?id=eq.${id}`, 'PATCH', { status: 'deleted', is_read: true });
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
    if (status) {
      query += `&status=eq.${status}`;
    } else {
      query += `&status=neq.deleted`;
    }
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

// DELETE /api/admin/emails/:id (permanent delete)
router.delete('/emails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: true, message: 'Email ID is required' });
    let result = await supabaseRequest(`emails?id=eq.${id}`, 'DELETE');
    if (result.status >= 200 && result.status < 300) {
      return res.json({ success: true, message: 'Email permanently removed' });
    }
    // Fallback to soft-delete so it disappears from UI even if permanent delete is blocked
    result = await supabaseRequest(`emails?id=eq.${id}`, 'PATCH', { status: 'deleted', is_read: true });
    if (result.status >= 200 && result.status < 300) {
      return res.json({ success: true, message: 'Email removed' });
    }
    return res.status(500).json({ error: true, message: 'Failed to remove email' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: true, message: 'Failed to remove email' });
  }
});

// --------- Content Management ---------
// GET /api/admin/contents
router.get('/contents', async (req, res) => {
  try {
    const { id, location, slot, limit = 100, offset = 0 } = req.query;
    let query = `contents?is_deleted=eq.false&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (id) query += `&id=eq.${id}`;
    if (location) query += `&location=eq.${location}`;
    if (slot) query += `&slot=eq.${slot}`;
    const result = await supabaseRequest(query, 'GET');
    if (result.status === 200) return res.json({ success: true, contents: result.data });
    return res.status(500).json({ error: true, message: 'Failed to fetch contents' });
  } catch (error) {
    console.error('List contents error:', error);
    res.status(500).json({ error: true, message: 'Failed to fetch contents' });
  }
});

// POST /api/admin/contents
router.post('/contents', async (req, res) => {
  try {
    const { location, slot, title, body, image_url, is_published = true } = req.body || {};
    if (!location || !slot) return res.status(400).json({ error: true, message: 'location and slot are required' });
    const payload = { location, slot, title: title || null, body: body || null, image_url: image_url || null, is_published: Boolean(is_published) };
    const result = await supabaseRequest('contents', 'POST', payload);
    if (result.status >= 200 && result.status < 300) return res.json({ success: true, content: result.data?.[0] || payload });
    return res.status(500).json({ error: true, message: 'Failed to create content' });
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: true, message: 'Failed to create content' });
  }
});

// PATCH /api/admin/contents/:id
router.patch('/contents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const result = await supabaseRequest(`contents?id=eq.${id}`, 'PATCH', update);
    if (result.status >= 200 && result.status < 300) return res.json({ success: true, content: result.data?.[0] || null });
    return res.status(500).json({ error: true, message: 'Failed to update content' });
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: true, message: 'Failed to update content' });
  }
});

// DELETE /api/admin/contents/:id (soft delete)
router.delete('/contents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await supabaseRequest(`contents?id=eq.${id}`, 'PATCH', { is_deleted: true, is_published: false });
    if (result.status >= 200 && result.status < 300) return res.json({ success: true, message: 'Content removed' });
    return res.status(500).json({ error: true, message: 'Failed to remove content' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ error: true, message: 'Failed to remove content' });
  }
});

// POST /api/admin/contents/upload (multipart form)
router.post('/contents/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: true, message: 'No file uploaded' });
    const relPath = `/uploads/${req.file.filename}`;
    return res.json({ success: true, url: relPath });
  } catch (error) {
    console.error('Upload content image error:', error);
    res.status(500).json({ error: true, message: 'Failed to upload image' });
  }
});

module.exports = router;
