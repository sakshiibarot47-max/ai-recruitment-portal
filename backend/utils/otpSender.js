// OTP bhejne ka kaam. Email aur SMS dono yahin se jaate hain.
//
// Settings na ho to (sirf development me) OTP server ke terminal me dikhta hai, kahin save nahi hota.
// Production me settings na ho to bhejna fail hota hai, taaki bina verification koi account na bane.
const nodemailer = require('nodemailer');

const isProduction = process.env.NODE_ENV === 'production';
const OTP_MINUTES = 10;

function devPrint(channel, to, code, purpose) {
  console.log('--------------------------------------------------');
  console.log(`[DEV OTP] ${purpose} code for ${to} (${channel}): ${code}`);
  console.log('--------------------------------------------------');
}

async function sendEmailOtp(to, code, purpose) {
  if (!process.env.SMTP_HOST) {
    if (isProduction) throw new Error('Email is not configured (SMTP_HOST missing)');
    return devPrint('email', to, code, purpose);
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const reason = purpose === 'reset' ? 'reset your password' : 'verify your account';
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `Your HireAI code: ${code}`,
    text: `Your HireAI code to ${reason} is ${code}. It works for ${OTP_MINUTES} minutes. If you did not ask for it, ignore this email.`,
  });
}

// MSG91: https://control.msg91.com/api/v5/otp (India me DLT template ID zaroori hai)
// DHYAN: ye part MSG91 account ke bina test nahi hua, pehli baar real SMS se jaanch lena.
async function sendSmsOtp(to, code, purpose) {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  if (provider !== 'msg91') {
    if (isProduction) throw new Error('SMS is not configured (SMS_PROVIDER missing)');
    return devPrint('sms', to, code, purpose);
  }

  const { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID } = process.env;
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) throw new Error('MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing');

  const params = new URLSearchParams({
    template_id: MSG91_TEMPLATE_ID,
    mobile: to.replace('+', ''), // 919876543210
    otp: code,
    otp_expiry: String(OTP_MINUTES),
  });
  const response = await fetch(`https://control.msg91.com/api/v5/otp?${params}`, {
    method: 'POST',
    headers: { authkey: MSG91_AUTH_KEY, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.type === 'error') {
    throw new Error(`MSG91 error: ${result.message || response.status}`);
  }
}

async function sendOtp({ channel, to, code, purpose }) {
  return channel === 'sms' ? sendSmsOtp(to, code, purpose) : sendEmailOtp(to, code, purpose);
}

module.exports = { sendOtp, OTP_MINUTES };
