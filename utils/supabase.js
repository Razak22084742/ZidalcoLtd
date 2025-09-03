const axios = require('axios');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;
const USE_MOCK = String(process.env.SUPABASE_MOCK).toLowerCase() === 'true' || !SUPABASE_URL || !SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
	console.warn('Supabase env vars are not set. Running in MOCK mode. Set SUPABASE_URL and SUPABASE_KEY to enable real DB.');
}

function getHeaders() {
	return {
		'apikey': SUPABASE_SERVICE_KEY,
		'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
		'Content-Type': 'application/json',
		'Prefer': 'return=representation'
	};
}

function mockSelectCountResponse() {
	return { status: 200, data: [{ count: 0 }] };
}

function mockOk() {
	return { status: 200, data: [] };
}

function mockCreated(data) {
	return { status: 201, data: [{ id: Date.now(), ...data }] };
}

async function supabaseRequest(endpoint, method = 'GET', data = null) {
	if (USE_MOCK) {
		const lowerEndpoint = String(endpoint).toLowerCase();
		// Counts
		if (lowerEndpoint.includes('select=count')) {
			return mockSelectCountResponse();
		}
		// Collections
		if (lowerEndpoint.startsWith('feedback') || lowerEndpoint.startsWith('emails')) {
			if (method === 'GET') return { status: 200, data: [] };
			if (method === 'POST') return mockCreated(data);
			if (method === 'PATCH') return mockOk();
		}
		if (lowerEndpoint.startsWith('feedback_replies') || lowerEndpoint.startsWith('email_replies')) {
			if (method === 'POST') return mockCreated(data);
		}
		if (lowerEndpoint.startsWith('contents')) {
			if (method === 'GET') return { status: 200, data: [] };
			if (method === 'POST') return mockCreated(data);
			if (method === 'PATCH') return mockOk();
		}
		// Default mock
		return mockOk();
	}

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
