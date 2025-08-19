const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // anon or service
const USE_MOCK = String(process.env.SUPABASE_MOCK).toLowerCase() === 'true' || !SUPABASE_URL || !SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL || 'http://mock.local', SUPABASE_KEY || 'mock-key', {
  auth: {
    persistSession: false
  }
});

async function getUserFromAccessToken(accessToken) {
  if (USE_MOCK) {
    return { user: { id: 'mock-user-id', email: 'admin@zidalco.com' }, error: null };
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

module.exports = { supabase, getUserFromAccessToken };
