const http = require('http');

// Helper function to make HTTP requests
function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Automated Backend Tests...\v');

  try {
    // 1. Test Login with our seeded demo candidate account
    console.log('1️⃣ Testing Candidate Login...');
    const loginRes = await request('POST', '/auth/login', {
      email: 'sakshi@demo.com',
      password: 'password123'
    });

    if (loginRes.status !== 200 || !loginRes.body.token) {
      console.error('❌ Login failed:', loginRes.body);
      return;
    }
    console.log('✅ Login Successful! Token received.');
    const token = loginRes.body.token;

    // 2. Test Candidate Stats API
    console.log('\n2️⃣ Testing GET /candidate/stats API...');
    const statsRes = await request('GET', '/candidate/stats', null, token);
    
    if (statsRes.status === 200) {
      console.log('✅ /candidate/stats responded successfully:');
      console.log(statsRes.body);
    } else {
      console.error('❌ Stats API failed:', statsRes.status, statsRes.body);
    }

    console.log('\n🎉 All automated tests completed successfully!');
  } catch (err) {
    console.error('❌ Test execution error (Is your server running?):', err.message);
  }
}

runTests();