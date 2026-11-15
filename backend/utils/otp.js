// OTP banana, jaanchna aur limit lagana. Database me OTP seedha nahi, sirf uska hash rakha jaata hai.
const crypto = require('crypto');
const db = require('../database');
const { sendOtp, OTP_MINUTES } = require('./otpSender');

const MAX_ATTEMPTS = 5; // galat koshish
const RESEND_GAP_MS = 30 * 1000; // do OTP ke beech kam se kam 30 second
const MAX_PER_HOUR = 5; // ek ghante me max 5 OTP

function hashCode(userId, purpose, code) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`${userId}:${purpose}:${code}`)
    .digest('hex');
}

// OTP bana ke bhejo. Rok lage ho to { ok:false, retryAfter } deta hai.
async function issueOtp(user, purpose, channel, to) {
  const now = Date.now();

  const last = db
    .prepare('SELECT created_at FROM otp_codes WHERE user_id = ? AND purpose = ? ORDER BY id DESC LIMIT 1')
    .get(user.id, purpose);
  if (last && now - last.created_at < RESEND_GAP_MS) {
    return { ok: false, retryAfter: Math.ceil((RESEND_GAP_MS - (now - last.created_at)) / 1000) };
  }

  const lastHour = db
    .prepare('SELECT COUNT(*) AS n FROM otp_codes WHERE user_id = ? AND purpose = ? AND created_at > ?')
    .get(user.id, purpose, now - 60 * 60 * 1000).n;
  if (lastHour >= MAX_PER_HOUR) return { ok: false, retryAfter: 3600 };

  const code = String(crypto.randomInt(100000, 1000000));

  // Purane bache hue OTP band, sirf naya chalega
  db.prepare('UPDATE otp_codes SET used = 1 WHERE user_id = ? AND purpose = ? AND used = 0').run(user.id, purpose);
  const inserted = db
    .prepare('INSERT INTO otp_codes (user_id, purpose, channel, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, purpose, channel, hashCode(user.id, purpose, code), now + OTP_MINUTES * 60 * 1000, now);

  try {
    await sendOtp({ channel, to, code, purpose });
  } catch (err) {
    // Bheja hi nahi gaya, to is OTP ko hata do aur error upar bhejo
    db.prepare('DELETE FROM otp_codes WHERE id = ?').run(inserted.lastInsertRowid);
    throw err;
  }
  return { ok: true };
}

// Code sahi hai ya nahi. Sahi ho to OTP use ho jaata hai (dobara nahi chalega).
function checkOtp(userId, purpose, code) {
  const row = db
    .prepare('SELECT * FROM otp_codes WHERE user_id = ? AND purpose = ? AND used = 0 ORDER BY id DESC LIMIT 1')
    .get(userId, purpose);

  if (!row || row.expires_at < Date.now()) return { ok: false, reason: 'expired' };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'locked' };

  const given = Buffer.from(hashCode(userId, purpose, String(code || '').trim()));
  const stored = Buffer.from(row.code_hash);
  const match = given.length === stored.length && crypto.timingSafeEqual(given, stored);

  if (!match) {
    db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(row.id);
    return { ok: false, reason: 'wrong', attemptsLeft: MAX_ATTEMPTS - row.attempts - 1 };
  }

  db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(row.id);
  return { ok: true };
}

module.exports = { issueOtp, checkOtp, MAX_ATTEMPTS };
