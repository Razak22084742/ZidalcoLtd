const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const feedbackRoutes = require('./routes/feedback');
const emailRoutes = require('./routes/emails');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const { supabaseRequest } = require('./utils/supabase');

app.use('/api/feedback', feedbackRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

// Public read for site contents
app.get('/api/contents', async (req, res) => {
  try {
    const { location, slot, limit = 20, offset = 0 } = req.query;
    let query = `contents?is_deleted=eq.false&is_published=eq.true&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (location) query += `&location=eq.${location}`;
    if (slot) query += `&slot=eq.${slot}`;
    const result = await supabaseRequest(query, 'GET');
    if (result.status === 200) return res.json({ success: true, contents: result.data });
    return res.status(500).json({ error: true, message: 'Failed to fetch contents' });
  } catch (e) {
    res.status(500).json({ error: true, message: 'Failed to fetch contents' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', ts: new Date().toISOString() });
});

// Fallbacks for top-level pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: true, message: 'Internal server error' });
});

// Export the app for Vercel serverless
module.exports = app;

// Start server only when run directly (local dev)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
