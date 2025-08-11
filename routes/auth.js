const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');

// POST /api/auth/login using Supabase Auth
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: true, message: error.message });

    // Return the access token for Authorization: Bearer
    return res.json({ success: true, message: 'Login successful', token: data.session.access_token, admin: { email } });
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'admin' } }
    });
    if (error) return res.status(400).json({ error: true, message: error.message });

    // Ensure a profile/admin row exists (optional if you keep admins table)
    // You can sync later on first admin access if needed.

    return res.json({ success: true, message: 'Admin account created. Check your email if confirmation is required.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: true, message: 'Signup failed' });
  }
});

module.exports = router;
