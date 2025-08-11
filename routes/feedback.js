const express = require('express');
const router = express.Router();
const { supabaseRequest } = require('../utils/supabase');
const { sendAdminNotification } = require('../utils/notifications');

// Submit customer feedback
router.post('/submit', async (req, res) => {
  try {
    const { name, message } = req.body;
    const email = (req.body.email || req.body.sender_email || '').toString();
    const phone = (req.body.phone || req.body.sender_phone || '').toString();
    const type = (req.body.type || 'general').toString();

    // Validate required fields
    if (!name || !message) {
      return res.status(400).json({
        error: true,
        message: 'Name and message are required'
      });
    }

    // Prepare feedback data
    const feedbackData = {
      name: String(name).trim(),
      email: email ? email.trim().toLowerCase() : 'unknown@local',
      phone: phone ? phone.trim() : '',
      message: String(message).trim(),
      type: type.trim(),
      status: 'new',
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Insert into Supabase
    const result = await supabaseRequest('feedback', 'POST', feedbackData);

    if (result.status >= 200 && result.status < 300) {
      // Send admin notification
      await sendAdminNotification('feedback', feedbackData);

      res.json({
        success: true,
        message: 'Feedback submitted successfully!',
        data: feedbackData
      });
    } else {
      throw new Error(`Failed to save feedback: ${JSON.stringify(result.data)}`);
    }

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to submit feedback'
    });
  }
});

// Get feedback (public)
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    
    let query = `feedback?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    // exclude deleted by default
    query += `&status=neq.deleted`;
    
    if (status) {
      query += `&status=eq.${status}`;
    }

    const result = await supabaseRequest(query, 'GET');

    if (result.status === 200) {
      res.json({
        success: true,
        feedback: result.data,
        count: result.data.length
      });
    } else {
      throw new Error('Failed to fetch feedback');
    }

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to fetch feedback'
    });
  }
});

// Get feedback by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await supabaseRequest(`feedback?id=eq.${id}`, 'GET');

    if (result.status === 200 && result.data.length > 0) {
      res.json({
        success: true,
        feedback: result.data[0]
      });
    } else {
      res.status(404).json({
        error: true,
        message: 'Feedback not found'
      });
    }

  } catch (error) {
    console.error('Get feedback by ID error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to fetch feedback'
    });
  }
});

// Update feedback status
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

    const result = await supabaseRequest(`feedback?id=eq.${id}`, 'PATCH', { status });

    if (result.status >= 200 && result.status < 300) {
      res.json({
        success: true,
        message: 'Status updated successfully'
      });
    } else {
      throw new Error('Failed to update status');
    }

  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to update status'
    });
  }
});

// Mark feedback as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await supabaseRequest(`feedback?id=eq.${id}`, 'PATCH', { is_read: true });

    if (result.status >= 200 && result.status < 300) {
      res.json({
        success: true,
        message: 'Marked as read'
      });
    } else {
      throw new Error('Failed to mark as read');
    }

  } catch (error) {
    console.error('Mark feedback as read error:', error);
    res.status(500).json({
      error: true,
      message: error.message || 'Failed to mark as read'
    });
  }
});

module.exports = router;
