const { getUserFromAccessToken } = require('../utils/supabaseClient');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: true, message: 'Authorization token required' });
  }
  const accessToken = authHeader.slice(7);
  try {
    const { user, error } = await getUserFromAccessToken(accessToken);
    if (error || !user) {
      return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }
    // attach supabase user to request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware };
