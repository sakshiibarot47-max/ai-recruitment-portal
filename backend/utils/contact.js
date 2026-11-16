// Email / phone / password ki safai aur jaanch. Poori auth yahin se ek hi tarah kaam karti hai.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

// Indian number: 9876543210, +91 98765 43210, 09876543210 -> sab "+919876543210" ban jaate hain
function normalizePhone(value) {
  let digits = String(value || '').replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

// "kuch@x.com" ya "98765..." dono me se jo bhi aaye, pehchan lo
function parseContact(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) {
    const email = normalizeEmail(raw);
    return email ? { type: 'email', value: email } : null;
  }
  const phone = normalizePhone(raw);
  return phone ? { type: 'phone', value: phone } : null;
}

function maskContact(contact) {
  if (contact.type === 'email') {
    const [name, domain] = contact.value.split('@');
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
  }
  return `${contact.value.slice(0, 3)}${'*'.repeat(5)}${contact.value.slice(-2)}`;
}

// Aasan / bahut common password ke tukde (chhote akshar me match hote hain)
const COMMON_PARTS = ['password', 'qwerty', '123456', 'abcdef', 'letmein', 'hireai'];

// Password ke rules (frontend jaise hi). Naam, email ya phone ho to usse milta-julta password bhi reject.
// personal = { name, email, phone }
function passwordProblem(password, personal = {}) {
  const p = String(password || '');
  if (!p) return 'Enter a password.';
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (p.length > 64) return 'Password must be 64 characters or fewer.';
  if (/\s/.test(p)) return 'Password cannot contain spaces.';
  if (!/[A-Z]/.test(p)) return 'Add at least one capital letter (A-Z).';
  if (!/[a-z]/.test(p)) return 'Add at least one small letter (a-z).';
  if (!/[0-9]/.test(p)) return 'Add at least one number (0-9).';
  if (!/[^A-Za-z0-9]/.test(p)) return 'Add at least one special character, like @ # ! $.';

  const lower = p.toLowerCase();
  if (COMMON_PARTS.some((part) => lower.includes(part))) {
    return 'This password is too easy to guess. Choose a different one.';
  }

  const mine = [];
  String(personal.name || '').toLowerCase().split(/\s+/).forEach((part) => {
    if (part.length >= 3) mine.push(part);
  });
  const emailLocal = String(personal.email || '').toLowerCase().split('@')[0];
  if (emailLocal.length >= 3) mine.push(emailLocal);
  const phoneDigits = String(personal.phone || '').replace(/\D/g, '').slice(-10);
  if (phoneDigits.length === 10) mine.push(phoneDigits);
  if (mine.some((part) => lower.includes(part))) {
    return 'Password cannot contain your name, email or phone number.';
  }
  return null;
}

function nameProblem(name) {
  const n = String(name || '').trim();
  if (n.length < 2 || n.length > 80) return 'Please enter your full name';
  return null;
}

module.exports = { normalizeEmail, normalizePhone, parseContact, maskContact, passwordProblem, nameProblem };
