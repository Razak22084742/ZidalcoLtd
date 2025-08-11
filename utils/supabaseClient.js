const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // anon or service

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

async function getUserFromAccessToken(accessToken) {
  // Validates the token against Supabase Auth and returns user or null
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

module.exports = { supabase, getUserFromAccessToken };
