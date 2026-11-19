const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { issueOtp, checkOtp, MAX_ATTEMPTS } = require('../utils/otp');
const {
  normalizeEmail,
  normalizePhone,
  parseContact,
  maskContact,
  passwordProblem,
  nameProblem,
} = require('../utils/contact');

const router = express.Router();

// true (default): naya account OTP se verify hone par hi chalta hai.
// false: purana tareeka (sirf jab naya frontend ready na ho). Live site par kabhi false mat rakhna.
const REQUIRE_VERIFICATION = process.env.REQUIRE_VERIFICATION !== 'false';

// Galat email par bhi utna hi time lage jitna sahi par lagta hai (taaki time se pata na chale)
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function findUserByContact(contact) {
  return contact.type === 'email'
    ? db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(contact.value)
    : db.prepare('SELECT * FROM users WHERE phone = ?').get(contact.value);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    company_name: user.company_name,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

// Password reset ka chhota token: OTP sahi hone ke baad milta hai, 10 minute chalta hai.
// Alag secret se bana hai, isliye login token ki jagah nahi chal sakta. Password badalte hi purana token bekaar.
const RESET_TOKEN_MINUTES = 10;
const resetSecret = () => `${process.env.JWT_SECRET}:password-reset`;

function resetFingerprint(user) {
  return crypto.createHmac('sha256', resetSecret()).update(user.password).digest('hex').slice(0, 16);
}

function signResetToken(user) {
  return jwt.sign({ id: user.id, purpose: 'password-reset', fp: resetFingerprint(user) }, resetSecret(), {
    expiresIn: `${RESET_TOKEN_MINUTES}m`,
  });
}

function userFromResetToken(token) {
  try {
    const payload = jwt.verify(String(token || ''), resetSecret());
    if (payload.purpose !== 'password-reset') return null;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
    if (!user || !user.is_verified || resetFingerprint(user) !== payload.fp) return null;
    return user;
  } catch (err) {
    return null;
  }
}

// OTP kahan bhejna hai: phone ho to SMS, warna email
function deliveryFor(user) {
  return user.phone
    ? { channel: 'sms', to: user.phone, masked: maskContact({ type: 'phone', value: user.phone }) }
    : { channel: 'email', to: user.email, masked: maskContact({ type: 'email', value: user.email }) };
}

function otpFailure(res, result) {
  if (result.reason === 'locked') {
    return res.status(429).json({ message: 'Too many wrong attempts. Please request a new code.' });
  }
  if (result.reason === 'wrong') {
    return res.status(400).json({
      message: `Incorrect code. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'try' : 'tries'} left.`,
    });
  }
  return res.status(400).json({ message: 'This code is incorrect or has expired. Please request a new one.' });
}

// POST /auth/register
// Candidate: { name, password, role:'candidate', contact }  (contact = email ya phone)
// Recruiter: { name, password, role:'recruiter', email, phone, company_name }
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const { name, password, role } = body;

  if (!['candidate', 'recruiter'].includes(role)) {
    return res.status(400).json({ message: 'Role must be candidate or recruiter' });
  }
  const problem = nameProblem(name) || passwordProblem(password);
  if (problem) return res.status(400).json({ message: problem });

  let email = null;
  let phone = null;

  if (body.contact) {
    const contact = parseContact(body.contact);
    if (!contact) return res.status(400).json({ message: 'Enter a valid email or phone number' });
    if (contact.type === 'email') email = contact.value;
    else phone = contact.value;
  }
  if (body.email) {
    email = normalizeEmail(body.email);
    if (!email) return res.status(400).json({ message: 'Enter a valid email address' });
  }
  if (body.phone) {
    phone = normalizePhone(body.phone);
    if (!phone) return res.status(400).json({ message: 'Enter a valid 10 digit mobile number' });
  }
  if (!email && !phone) {
    return res.status(400).json({ message: 'Enter a valid email or phone number' });
  }

  const personalIssue = passwordProblem(password, { name, email, phone });
  if (personalIssue) return res.status(400).json({ message: personalIssue });

  let companyName = null;
  if (role === 'recruiter') {
    companyName = String(body.company_name || '').trim();
    if (REQUIRE_VERIFICATION) {
      if (companyName.length < 2 || companyName.length > 100) {
        return res.status(400).json({ message: 'Please enter your company name' });
      }
      if (!email || !phone) {
        return res.status(400).json({ message: 'Recruiters must give both an email and a phone number' });
      }
    }
    companyName = companyName || null;
  }

  // Pehle se verified account hai to rok do. Adhura (verify nahi hua) purana account hata ke dobara banate hain.
  const existing = db
    .prepare('SELECT id, is_verified FROM users WHERE email = ? COLLATE NOCASE OR phone = ?')
    .all(email, phone);
  if (existing.some((row) => row.is_verified)) {
    return res.status(409).json({ message: 'An account with this email or phone number already exists' });
  }
  for (const row of existing) {
    db.prepare('DELETE FROM otp_codes WHERE user_id = ?').run(row.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(row.id);
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const inserted = db
    .prepare('INSERT INTO users (name, email, phone, password, role, company_name, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(String(name).trim(), email, phone, hashedPassword, role, companyName, REQUIRE_VERIFICATION ? 0 : 1);

  if (!REQUIRE_VERIFICATION) {
    return res.status(201).json({ message: 'Registered successfully', userId: inserted.lastInsertRowid });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(inserted.lastInsertRowid);
  const delivery = deliveryFor(user);

  try {
    await issueOtp(user, 'register', delivery.channel, delivery.to);
  } catch (err) {
    console.log('Could not send register OTP:', err.message);
    db.prepare('DELETE FROM otp_codes WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    return res.status(503).json({ message: 'We could not send the code right now. Please try again in a moment.' });
  }

  res.status(201).json({
    message: 'We sent you a 6 digit code',
    needsVerification: true,
    channel: delivery.channel,
    sentTo: delivery.masked,
    contact: phone || email, // frontend isse verify-otp aur resend-otp me bhejega
  });
});

// POST /auth/verify-otp  { contact, code }  -> OTP sahi ho to account verify + seedha login
router.post('/verify-otp', (req, res) => {
  const contact = parseContact(req.body && req.body.contact);
  const code = String((req.body && req.body.code) || '').trim();
  if (!contact || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6 digit code' });
  }

  const user = findUserByContact(contact);
  if (!user || user.is_verified) {
    return res.status(400).json({ message: 'This code is incorrect or has expired. Please request a new one.' });
  }

  const result = checkOtp(user.id, 'register', code);
  if (!result.ok) return otpFailure(res, result);

  db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(user.id);
  const verified = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ message: 'Account verified', token: signToken(verified), user: publicUser(verified) });
});

// POST /auth/resend-otp  { contact }  -> verify nahi hue account ko naya code
router.post('/resend-otp', async (req, res) => {
  const contact = parseContact(req.body && req.body.contact);
  if (!contact) return res.status(400).json({ message: 'Enter a valid email or phone number' });

  const user = findUserByContact(contact);
  const generic = { message: 'If this account is waiting for verification, a new code has been sent.' };
  if (!user || user.is_verified) return res.json(generic);

  const delivery = deliveryFor(user);
  try {
    const result = await issueOtp(user, 'register', delivery.channel, delivery.to);
    if (!result.ok) {
      return res.status(429).json({
        message: `Please wait ${result.retryAfter} seconds before asking for another code.`,
        retryAfter: result.retryAfter,
      });
    }
  } catch (err) {
    console.log('Could not send register OTP:', err.message);
    return res.status(503).json({ message: 'We could not send the code right now. Please try again in a moment.' });
  }
  res.json({ ...generic, channel: delivery.channel, sentTo: delivery.masked });
});

// POST /auth/login  { identifier (email ya phone), password }
router.post('/login', (req, res) => {
  const body = req.body || {};
  const contact = parseContact(body.identifier ?? body.contact ?? body.email);
  const password = String(body.password || '');

  if (!contact || !password) {
    return res.status(400).json({ message: 'Enter your email or phone number and your password' });
  }

  const user = findUserByContact(contact);
  const passwordMatches = bcrypt.compareSync(password, user ? user.password : DUMMY_HASH);
  if (!user || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.is_verified) {
    return res.status(403).json({
      message: 'Please verify your account first. We can send you a new code.',
      needsVerification: true,
      contact: contact.value,
    });
  }

  res.json({ message: 'Login successful', token: signToken(user), user: publicUser(user) });
});

// POST /auth/forgot-password  { contact }  -> hamesha ek hi jawab (pata na chale ki account hai ya nahi)
router.post('/forgot-password', async (req, res) => {
  const generic = { message: 'If an account exists for this, we sent a 6 digit code.' };
  const contact = parseContact(req.body && req.body.contact);
  if (!contact) return res.status(400).json({ message: 'Enter a valid email or phone number' });

  const user = findUserByContact(contact);
  if (user && user.is_verified) {
    try {
      await issueOtp(user, 'reset', contact.type === 'phone' ? 'sms' : 'email', contact.value);
    } catch (err) {
      console.log('Could not send reset OTP:', err.message);
    }
  }
  res.json(generic);
});

// POST /auth/verify-reset-otp  { contact, code }  -> OTP sahi ho to resetToken (naya password page ke liye)
router.post('/verify-reset-otp', (req, res) => {
  const contact = parseContact(req.body && req.body.contact);
  const code = String((req.body && req.body.code) || '').trim();
  if (!contact || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the 6 digit code' });
  }

  const user = findUserByContact(contact);
  if (!user || !user.is_verified) {
    return res.status(400).json({ message: 'This code is incorrect or has expired. Please request a new one.' });
  }

  const result = checkOtp(user.id, 'reset', code);
  if (!result.ok) return otpFailure(res, result);

  res.json({ message: 'Code verified', resetToken: signResetToken(user), expiresInMinutes: RESET_TOKEN_MINUTES });
});

// POST /auth/reset-password  { resetToken, newPassword }
// (purana tareeka { contact, code, newPassword } abhi bhi chalta hai)
router.post('/reset-password', (req, res) => {
  const body = req.body || {};
  const problem = passwordProblem(body.newPassword);
  if (problem) return res.status(400).json({ message: problem });

  let user;

  if (body.resetToken) {
    user = userFromResetToken(body.resetToken);
    if (!user) {
      return res.status(400).json({ message: 'This reset session has expired. Please start again.' });
    }
    const personalIssue = passwordProblem(body.newPassword, { name: user.name, email: user.email, phone: user.phone });
    if (personalIssue) return res.status(400).json({ message: personalIssue });
  } else {
    const contact = parseContact(body.contact);
    const code = String(body.code || '').trim();
    if (!contact || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Enter the 6 digit code' });
    }

    user = findUserByContact(contact);
    if (!user || !user.is_verified) {
      return res.status(400).json({ message: 'This code is incorrect or has expired. Please request a new one.' });
    }

    // Naam / email / phone wala password abhi hi rok do, taaki OTP kharch na ho
    const personalIssue = passwordProblem(body.newPassword, { name: user.name, email: user.email, phone: user.phone });
    if (personalIssue) return res.status(400).json({ message: personalIssue });

    const result = checkOtp(user.id, 'reset', code);
    if (!result.ok) return otpFailure(res, result);
  }

  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(body.newPassword, 10), user.id);
  res.json({ message: 'Password updated. Please sign in with your new password.' });
});

router.maxOtpAttempts = MAX_ATTEMPTS;
module.exports = router;