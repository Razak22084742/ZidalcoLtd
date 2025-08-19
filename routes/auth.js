const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const USE_MOCK = String(process.env.SUPABASE_MOCK).toLowerCase() === 'true' || !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;

// POST /api/auth/login using Supabase Auth
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    if (USE_MOCK) {
      return res.json({ success: true, message: 'Login successful (mock)', token: 'mock-token', admin: { id: 'mock-admin', name: 'Admin', email } });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: true, message: error.message });

    // Return the access token for Authorization: Bearer
    return res.json({ success: true, message: 'Login successful', token: data.session.access_token, admin: { id: data.user?.id, name: data.user?.user_metadata?.name, email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: true, message: 'Login failed' });
  }
});

// POST /api/auth/signup using Supabase Auth
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, confirm_password } = req.body;
    if (!name || !email || !password || !confirm_password) {
      return res.status(400).json({ error: true, message: 'All fields are required' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ error: true, message: 'Passwords do not match' });
    }

    if (USE_MOCK) {
      return res.json({ success: true, message: 'Admin account created (mock).' });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'admin' } }
    });
    if (error) return res.status(400).json({ error: true, message: error.message });

    return res.json({ success: true, message: 'Admin account created. Check your email if confirmation is required.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: true, message: 'Signup failed' });
  }
});

module.exports = router;
