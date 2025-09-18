#!/usr/bin/env node

/**
 * Test script to verify cross-origin cookie authentication
 * This simulates the authentication flow between frontend and backend
 */

const fetch = require('node-fetch');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';

// Helper function to extract cookies from response headers
function extractCookies(response) {
  const cookieHeader = response.headers.get('set-cookie');
  if (!cookieHeader) return null;

  const cookies = {};
  cookieHeader.split(',').forEach(cookie => {
    const [nameValue] = cookie.trim().split(';');
    const [name, value] = nameValue.split('=');
    if (name && value) {
      cookies[name.trim()] = value.trim();
    }
  });
  return cookies;
}

// Test the authentication flow
async function testAuthFlow() {
  console.log('🧪 Testing cross-origin cookie authentication...\n');

  // Step 1: Test login endpoint
  console.log('1. Testing login...');
  try {
    const loginResponse = await fetch(`${BACKEND_URL}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      }),
      credentials: 'include'
    });

    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Headers:`, Object.fromEntries(loginResponse.headers.entries()));

    const cookies = extractCookies(loginResponse);
    console.log(`   Cookies set:`, cookies);

    if (cookies && cookies.auth_token) {
      console.log('   ✅ Login successful, auth_token cookie set');

      // Step 2: Test /me endpoint with the cookie
      console.log('\n2. Testing /me endpoint...');
      const meResponse = await fetch(`${BACKEND_URL}/v1/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL,
          'Cookie': `auth_token=${cookies.auth_token}`
        },
        credentials: 'include'
      });

      console.log(`   Status: ${meResponse.status}`);

      if (meResponse.ok) {
        const userData = await meResponse.json();
        console.log('   ✅ /me endpoint successful');
        console.log('   User data:', userData);
      } else {
        const errorData = await meResponse.json();
        console.log('   ❌ /me endpoint failed:', errorData);
      }
    } else {
      console.log('   ❌ No auth_token cookie found in response');
    }
  } catch (error) {
    console.error('   ❌ Test failed:', error.message);
  }
}

// Run the test
testAuthFlow();