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

// Frontend ke rules jaise hi: 8+ akshar, A-Z, a-z, 0-9, special, koi space nahi
function passwordProblem(password) {
  const p = String(password || '');
  if (p.length < 8) return 'Password must be at least 8 characters';
  if (p.length > 64) return 'Password must be 64 characters or fewer';
  if (/\s/.test(p)) return 'Password must not contain spaces';
  if (!/[A-Z]/.test(p)) return 'Password needs one capital letter';
  if (!/[a-z]/.test(p)) return 'Password needs one small letter';
  if (!/[0-9]/.test(p)) return 'Password needs one number';
  if (!/[^A-Za-z0-9]/.test(p)) return 'Password needs one special character';
  return null;
}

function nameProblem(name) {
  const n = String(name || '').trim();
  if (n.length < 2 || n.length > 80) return 'Please enter your full name';
  return null;
}

module.exports = { normalizeEmail, normalizePhone, parseContact, maskContact, passwordProblem, nameProblem };
