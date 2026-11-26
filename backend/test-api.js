const http = require('http');

// Helper function to make JSON HTTP requests
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
      res.on('data', (chunk) => (body += chunk));
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

// Helper function to upload files using multipart/form-data
function uploadFile(method, path, fieldName, fileName, mimeType, fileBuffer, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----HireAITestBoundary' + Date.now();
    const headerPart = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`,
      'utf8'
    );
    const footerPart = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const bodyBuffer = Buffer.concat([headerPart, Buffer.from(fileBuffer), footerPart]);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length,
    };
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
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Automated Backend Tests...\n');

  try {
    // 1. Test Login with our seeded demo candidate account
    console.log('1️⃣ Testing Candidate Login...');
    const loginRes = await request('POST', '/auth/login', {
      email: 'sakshi@demo.com',
      password: 'password123',
    });

    if (loginRes.status !== 200 || !loginRes.body || !loginRes.body.token) {
      console.error('❌ Login failed:', loginRes.body);
      return;
    }
    console.log('✅ Login Successful! Token received.');
    const token = loginRes.body.token;

    // 2. Test Candidate Stats API
    console.log('\n2️⃣ Testing GET /candidate/stats API...');
    const statsRes = await request('GET', '/candidate/stats', null, token);
    if (statsRes.status === 200) {
      console.log('✅ /candidate/stats responded successfully:', statsRes.body);
    } else {
      console.error('❌ Stats API failed:', statsRes.status, statsRes.body);
    }

    // 3. Valid PDF Resume Apply (expect 200 or 201)
    console.log('\n3️⃣ Testing Valid PDF Apply...');
    const samplePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const applyRes = await uploadFile(
      'POST',
      '/jobs/1/apply',
      'resume',
      'resume.pdf',
      'application/pdf',
      samplePdf,
      token
    );
    console.log(
      [200, 201].includes(applyRes.status) ? '✅ PDF Apply PASS:' : '❌ PDF Apply FAIL:',
      applyRes.status
    );

    // 4. Duplicate Apply on same job (expect 409)
    console.log('\n4️⃣ Testing Duplicate Apply (409)...');
    const dupRes = await uploadFile(
      'POST',
      '/jobs/1/apply',
      'resume',
      'resume.pdf',
      'application/pdf',
      samplePdf,
      token
    );
    console.log(
      dupRes.status === 409 ? '✅ Duplicate Apply 409 PASS:' : '❌ Duplicate Apply 409 FAIL:',
      dupRes.status
    );

    // 5. Non-PDF Resume Upload (expect 400)
    console.log('\n5️⃣ Testing Non-PDF Upload (400)...');
    const nonPdfRes = await uploadFile(
      'POST',
      '/jobs/2/apply',
      'resume',
      'resume.txt',
      'text/plain',
      Buffer.from('plain text resume'),
      token
    );
    console.log(
      nonPdfRes.status === 400 ? '✅ Non-PDF 400 PASS:' : '❌ Non-PDF 400 FAIL:',
      nonPdfRes.status
    );

    // 6. Suggestion-Only Resume Import without overwriting /profile/me
    console.log('\n6️⃣ Testing Suggestion-Only Resume Import...');
    const beforeProfile = await request('GET', '/profile/me', null, token);
    const importRes = await uploadFile(
      'POST',
      '/profile/import-resume',
      'resume',
      'import.pdf',
      'application/pdf',
      Buffer.from('%PDF-1.4\nSkills: Node.js, SQL, Express\n%%EOF'),
      token
    );
    const afterProfile = await request('GET', '/profile/me', null, token);
    const profileUnchanged =
      JSON.stringify(beforeProfile.body) === JSON.stringify(afterProfile.body);
    const hasSuggestions = Boolean(importRes.body && importRes.body.suggestions);
    console.log(
      importRes.status === 200 && hasSuggestions && profileUnchanged
        ? '✅ Suggestion-Only Import PASS:'
        : '❌ Suggestion-Only Import FAIL:',
      importRes.status,
      { hasSuggestions, profileUnchanged }
    );

    // 7. Saved Jobs Add & Remove
    console.log('\n7️⃣ Testing Saved Jobs Add & Remove...');
    const saveRes = await request('POST', '/saved-jobs', { jobId: 2 }, token);
    const delSavedRes = await request('DELETE', '/saved-jobs/2', null, token);
    console.log(
      [200, 201].includes(saveRes.status) && [200, 204].includes(delSavedRes.status)
        ? '✅ Saved Jobs Add/Remove PASS:'
        : '❌ Saved Jobs Add/Remove FAIL:',
      saveRes.status,
      delSavedRes.status
    );

    // 8. Notifications List & Mark as Read
    console.log('\n8️⃣ Testing Notifications List & Read...');
    const notifRes = await request('GET', '/notifications', null, token);
    const items = Array.isArray(notifRes.body)
      ? notifRes.body
      : notifRes.body?.notifications || [];
    let readStatus = 200;
    if (items.length > 0 && items[0].id) {
      const markReadRes = await request(
        'PUT',
        `/notifications/${items[0].id}/read`,
        {},
        token
      );
      readStatus = markReadRes.status;
    }
    console.log(
      notifRes.status === 200 && readStatus === 200
        ? '✅ Notifications List & Read PASS:'
        : '❌ Notifications List & Read FAIL:',
      notifRes.status,
      readStatus
    );

    console.log('\n🎉 All automated tests completed!');
  } catch (err) {
    console.error('❌ Test execution error (Is your server running?):', err.message);
  }
}

runTests();