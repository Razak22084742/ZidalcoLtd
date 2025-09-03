const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const axios = require('axios');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const USE_MOCK = String(process.env.SUPABASE_MOCK).toLowerCase() === 'true';

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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return res.status(401).json({ error: true, message: error.message });
      return res.json({ success: true, message: 'Login successful', token: data.session.access_token, admin: { id: data.user?.id, name: data.user?.user_metadata?.name, email } });
    } catch (e) {
      // Fallback to REST if fetch failed
      if (String(e?.message || '').includes('fetch failed')) {
        try {
          const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
          const resp = await axios.post(url, { email, password }, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' } });
          if (resp.status >= 200 && resp.status < 300) {
            const d = resp.data;
            return res.json({ success: true, message: 'Login successful', token: d.access_token, admin: { id: d.user?.id, name: d.user?.user_metadata?.name, email } });
          }
          return res.status(401).json({ error: true, message: 'Invalid credentials' });
        } catch (restErr) {
          console.error('Login REST fallback error:', restErr?.response?.data || restErr?.message);
          return res.status(400).json({ error: true, message: 'Login failed' });
        }
      }
      throw e;
    }
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: 'admin' } }
      });
      if (error) return res.status(400).json({ error: true, message: error.message });
      return res.json({ success: true, message: 'Admin account created. Check your email if confirmation is required.' });
    } catch (e) {
      if (String(e?.message || '').includes('fetch failed')) {
        try {
          const url = `${SUPABASE_URL}/auth/v1/signup`;
          const resp = await axios.post(url, { email, password, data: { name, role: 'admin' } }, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' } });
          if (resp.status >= 200 && resp.status < 300) {
            return res.json({ success: true, message: 'Admin account created. Check your email if confirmation is required.' });
          }
          return res.status(400).json({ error: true, message: 'Signup failed' });
        } catch (restErr) {
          console.error('Signup REST fallback error:', restErr?.response?.data || restErr?.message);
          const msg = restErr?.response?.data?.msg || restErr?.response?.data?.message || restErr?.message || 'Signup failed';
          // Temporary debug (sanitized): key length and URL host
          const keyLen = (SUPABASE_KEY || '').length;
          const urlHost = (() => { try { return new URL(SUPABASE_URL).host; } catch { return SUPABASE_URL; } })();
          return res.status(400).json({ error: true, message: msg, debug: { keyLen, urlHost } });
        }
      }
      throw e;
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: true, message: 'Signup failed' });
  }
});

// POST /api/auth/forgot-password using Supabase Auth
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: true, message: 'Email is required' });
    }

    if (USE_MOCK) {
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent (mock).' });
    }
    const redirectTo = process.env.SUPABASE_REDIRECT_URL || 'http://localhost:3000/admin';
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return res.status(400).json({ error: true, message: error.message });
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    } catch (e) {
      if (String(e?.message || '').includes('fetch failed')) {
        try {
          const url = `${SUPABASE_URL}/auth/v1/recover`;
          const resp = await axios.post(url, { email, redirect_to: redirectTo }, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' } });
          if (resp.status >= 200 && resp.status < 300) return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
          return res.status(400).json({ error: true, message: 'Reset request failed' });
        } catch (restErr) {
          console.error('Forgot password REST fallback error:', restErr?.response?.data || restErr?.message);
          return res.status(400).json({ error: true, message: 'Failed to request password reset' });
        }
      }
      throw e;
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: true, message: 'Failed to request password reset' });
  }
});

module.exports = router;
