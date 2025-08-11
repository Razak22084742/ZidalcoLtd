const axios = require('axios');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('Supabase env vars are not set. Please configure SUPABASE_URL and SUPABASE_KEY.');
}

function getHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

async function supabaseRequest(endpoint, method = 'GET', data = null) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  try {
    const response = await axios({
      url,
      method,
      data,
      headers: getHeaders(),
      validateStatus: () => true
    });
    return { status: response.status, data: response.data };
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

module.exports = { supabaseRequest };
