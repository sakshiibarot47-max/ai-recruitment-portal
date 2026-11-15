// Naye login system ka automatic test.  Chalane ke liye (backend folder me):  node test-auth.js
// Ye apna alag server aur alag temporary database banata hai, tumhare asli data ko haath nahi lagata.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const PORT = 5099;
const BASE = `http://localhost:${PORT}`;
const SECRET = 'test-secret-' + 'x'.repeat(40);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hireai-auth-'));

let passed = 0;
let failed = 0;
function check(name, condition, extra) {
  if (condition) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? '  -> ' + JSON.stringify(extra) : '')); }
}

async function call(method, url, body, headers = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* body khali */ }
  return { status: res.status, data, headers: res.headers };
}

let serverLog = '';
function lastOtpFor(contact) {
  const matches = [...serverLog.matchAll(/\[DEV OTP\] (\w+) code for (\S+) \((\w+)\): (\d{6})/g)]
    .filter((m) => m[2] === contact);
  return matches.length ? matches[matches.length - 1][4] : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Purane shape ka database banao (email NOT NULL), ek purana user daalo
  const legacy = new Database(path.join(tmp, 'recruitment.db'));
  legacy.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('candidate','recruiter')));`);
  legacy.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)')
    .run('Old User', 'Old.User@Demo.com', bcrypt.hashSync('password123', 10), 'candidate');
  legacy.close();

  const server = spawn('node', [path.join(__dirname, 'server.js')], {
    cwd: tmp,
    env: { ...process.env, PORT: String(PORT), JWT_SECRET: SECRET, AUTH_RATE_LIMIT: '1000', REQUIRE_VERIFICATION: 'true', NODE_ENV: 'development', SMTP_HOST: '', SMS_PROVIDER: '' },
  });
  server.stdout.on('data', (d) => { serverLog += d.toString(); });
  server.stderr.on('data', (d) => { serverLog += d.toString(); });

  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/api/health'); break; } catch (e) { await sleep(150); } }

  try {
    console.log('\nPurana database aur purane users');
    let r = await call('POST', '/auth/login', { identifier: 'old.user@demo.com', password: 'password123' });
    check('purana user (mixed-case email) abhi bhi login kar sakta hai', r.status === 200 && r.data.token, r);
    r = await call('POST', '/auth/login', { email: 'old.user@demo.com', password: 'password123' });
    check('purana frontend ka { email, password } format chalta hai', r.status === 200, r);

    console.log('\nCandidate register (phone se)');
    r = await call('POST', '/auth/register', { name: 'Hiral Test', contact: '98765 43210', password: 'weak', role: 'candidate' });
    check('kamzor password reject', r.status === 400, r);
    r = await call('POST', '/auth/register', { name: 'Hiral Test', contact: '12345', password: 'Strong@123', role: 'candidate' });
    check('galat phone reject', r.status === 400, r);
    r = await call('POST', '/auth/register', { name: 'Hiral Test', contact: '98765 43210', password: 'Strong@123', role: 'candidate' });
    check('register 201 aur OTP maanga', r.status === 201 && r.data.needsVerification && r.data.channel === 'sms', r);
    check('response me OTP nahi hai', !JSON.stringify(r.data).match(/\b\d{6}\b/), r.data);
    check('number mask hua dikhta hai', r.data.sentTo && r.data.sentTo.includes('*') && !r.data.sentTo.includes('9876543210'), r.data);
    const phone = r.data.contact;
    check('phone +91 format me save hua', phone === '+919876543210', phone);

    r = await call('POST', '/auth/login', { identifier: '9876543210', password: 'Strong@123' });
    check('verify se pehle login 403', r.status === 403 && r.data.needsVerification, r);
    r = await call('POST', '/auth/resend-otp', { contact: phone });
    check('30 second se pehle resend 429', r.status === 429, r);

    const code = lastOtpFor(phone);
    check('OTP server terminal me aaya', /^\d{6}$/.test(code || ''), serverLog.slice(-300));
    const wrong = code === '000000' ? '111111' : '000000';
    r = await call('POST', '/auth/verify-otp', { contact: phone, code: wrong });
    check('galat OTP 400 aur kitni koshish bachi', r.status === 400 && /4 tries left/.test(r.data.message), r);
    r = await call('POST', '/auth/verify-otp', { contact: phone, code });
    check('sahi OTP: account verify + token', r.status === 200 && r.data.token && r.data.user.phone === phone, r);
    const token = r.data.token;
    r = await call('POST', '/auth/verify-otp', { contact: phone, code });
    check('wahi OTP dobara use nahi hota', r.status === 400, r);
    r = await call('GET', '/candidate/stats', null, { Authorization: 'Bearer ' + token });
    check('naya token baaki API me chalta hai', r.status !== 401 && r.status !== 403, r);

    console.log('\nLogin');
    for (const id of ['9876543210', '+91 98765-43210', '09876543210']) {
      r = await call('POST', '/auth/login', { identifier: id, password: 'Strong@123' });
      check(`phone "${id}" se login`, r.status === 200, r);
    }
    r = await call('POST', '/auth/login', { identifier: '9876543210', password: 'Wrong@123' });
    check('galat password 401', r.status === 401, r);
    r = await call('POST', '/auth/login', { identifier: 'nobody@nowhere.com', password: 'Wrong@123' });
    const sameMsg = r.data.message;
    r = await call('POST', '/auth/login', { identifier: '9876543210', password: 'Wrong@123' });
    check('galat user aur galat password ka message ek jaisa', r.data.message === sameMsg, r.data);

    console.log('\nDuplicate aur adhura register');
    r = await call('POST', '/auth/register', { name: 'Again', contact: '9876543210', password: 'Strong@123', role: 'candidate' });
    check('verified number dobara register 409', r.status === 409, r);

    r = await call('POST', '/auth/register', { name: 'Half Done', contact: 'half@done.com', password: 'Strong@123', role: 'candidate' });
    check('email se register (OTP email se)', r.status === 201 && r.data.channel === 'email', r);
    r = await call('POST', '/auth/register', { name: 'Half Done Again', contact: 'half@done.com', password: 'Strong@123', role: 'candidate' });
    check('verify nahi hua email dobara register ho sakta hai', r.status === 201, r);

    console.log('\nRecruiter register');
    r = await call('POST', '/auth/register', { name: 'Rec One', email: 'rec@acme.com', password: 'Strong@123', role: 'recruiter', company_name: 'Acme' });
    check('recruiter bina phone ke reject', r.status === 400, r);
    r = await call('POST', '/auth/register', { name: 'Rec One', email: 'rec@acme.com', phone: '9123456780', password: 'Strong@123', role: 'recruiter' });
    check('recruiter bina company ke reject', r.status === 400, r);
    r = await call('POST', '/auth/register', { name: 'Rec One', email: 'Rec@Acme.com', phone: '9123456780', password: 'Strong@123', role: 'recruiter', company_name: 'Acme Pvt Ltd' });
    check('recruiter register: OTP phone par', r.status === 201 && r.data.channel === 'sms', r);
    const recContact = r.data.contact;
    r = await call('POST', '/auth/verify-otp', { contact: recContact, code: lastOtpFor(recContact) });
    check('recruiter verify, company aur dono contact save', r.status === 200 && r.data.user.company_name === 'Acme Pvt Ltd' && r.data.user.email === 'rec@acme.com' && r.data.user.phone === '+919123456780', r);
    r = await call('POST', '/auth/login', { identifier: 'REC@acme.com', password: 'Strong@123' });
    check('recruiter email se bhi login kar sakta hai', r.status === 200 && r.data.user.role === 'recruiter', r);

    console.log('\nOTP lock (5 galat koshish)');
    r = await call('POST', '/auth/register', { name: 'Lock Test', contact: '9000000001', password: 'Strong@123', role: 'candidate' });
    const lockContact = r.data.contact;
    const realLock = lastOtpFor(lockContact);
    const bad = realLock === '123456' ? '654321' : '123456';
    let last;
    for (let i = 0; i < 5; i++) last = await call('POST', '/auth/verify-otp', { contact: lockContact, code: bad });
    r = await call('POST', '/auth/verify-otp', { contact: lockContact, code: realLock });
    check('5 galat ke baad sahi OTP bhi band (429)', r.status === 429, r);

    console.log('\nPassword bhool gaye (forgot / reset)');
    const before = serverLog.length;
    r = await call('POST', '/auth/forgot-password', { contact: '9999999999' });
    const unknownMsg = r.data.message;
    check('anjaan number par bhi 200 aur OTP nahi bheja', r.status === 200 && !serverLog.slice(before).includes('+919999999999'), r);
    r = await call('POST', '/auth/forgot-password', { contact: '9876543210' });
    check('asli number par 200 aur wahi message', r.status === 200 && r.data.message === unknownMsg, r);
    const resetCode = lastOtpFor('+919876543210');
    check('reset OTP aaya', /^\d{6}$/.test(resetCode || ''), serverLog.slice(-200));
    const wrongReset = resetCode === '000000' ? '111111' : '000000';
    r = await call('POST', '/auth/reset-password', { contact: '9876543210', code: wrongReset, newPassword: 'NewPass@456' });
    check('galat reset OTP 400', r.status === 400, r);
    r = await call('POST', '/auth/reset-password', { contact: '9876543210', code: resetCode, newPassword: 'weak' });
    check('reset me kamzor password reject', r.status === 400, r);
    r = await call('POST', '/auth/reset-password', { contact: '9876543210', code: resetCode, newPassword: 'NewPass@456' });
    check('sahi OTP se password badla', r.status === 200, r);
    r = await call('POST', '/auth/login', { identifier: '9876543210', password: 'Strong@123' });
    check('purana password ab nahi chalta', r.status === 401, r);
    r = await call('POST', '/auth/login', { identifier: '9876543210', password: 'NewPass@456' });
    check('naya password chalta hai', r.status === 200, r);
    r = await call('POST', '/auth/reset-password', { contact: '9876543210', code: resetCode, newPassword: 'Another@789' });
    check('reset OTP dobara use nahi hota', r.status === 400, r);

    console.log('\nSecurity');
    const forged = jwt.sign({ id: 1, role: 'recruiter' }, 'mysecretkey12345', { expiresIn: '1d' });
    r = await call('GET', '/candidate/stats', null, { Authorization: 'Bearer ' + forged });
    check('purane public secret se bana token reject (401)', r.status === 401, r);
    const evil = await fetch(BASE + '/api/health', { headers: { Origin: 'https://evil.example' } });
    check('anjaan website ko CORS permission nahi', !evil.headers.get('access-control-allow-origin'));
    const good = await fetch(BASE + '/api/health', { headers: { Origin: 'http://localhost:5173' } });
    check('apna frontend (5173) allowed', good.headers.get('access-control-allow-origin') === 'http://localhost:5173');
    const db = new Database(path.join(tmp, 'recruitment.db'), { readonly: true });
    const stored = db.prepare('SELECT code_hash FROM otp_codes LIMIT 1').get();
    check('database me OTP hash hai, seedha code nahi', stored && stored.code_hash.length === 64);
    const files = fs.readdirSync(__dirname);
    check('OTP kisi file me save nahi hua', !files.includes('email-preview.html') || !fs.readFileSync(path.join(__dirname, 'email-preview.html'), 'utf8').match(/\bcode\b.*\d{6}/));
    db.close();
  } finally {
        server.kill();
    await new Promise((resolve) => { server.once('exit', resolve); setTimeout(resolve, 2000); });
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* temp folder baad me khud saaf ho jayega */ }
  }

  console.log(`\n${passed} pass, ${failed} fail`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
