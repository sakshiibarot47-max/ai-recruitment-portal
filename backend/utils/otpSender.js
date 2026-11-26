const nodemailer = require('nodemailer');

const OTP_MINUTES = 10;

function devPrint(channel, to, code, purpose) {
  console.log('--------------------------------------------------');
  console.log(`[DEV OTP] ${purpose} code for ${to} (${channel}): ${code}`);
  console.log('--------------------------------------------------');
}

async function sendEmailOtp(to, code, purpose) {
  if (!process.env.SMTP_HOST) {
    console.warn('[OTP Fallback] SMTP_HOST missing; skipping external email send.');
    return devPrint('email', to, code, purpose);
  }

  try {
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
  } catch (err) {
    console.warn('[OTP Fallback] Email send failed, falling back:', err.message);
    return devPrint('email', to, code, purpose);
  }
}

async function sendSmsOtp(to, code, purpose) {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  if (provider !== 'msg91') {
    console.warn('[OTP Fallback] SMS_PROVIDER not set to msg91; skipping SMS send.');
    return devPrint('sms', to, code, purpose);
  }

  const { MSG91_AUTH_KEY, MSG91_TEMPLATE_ID } = process.env;
  if (!MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    console.warn('[OTP Fallback] MSG91 credentials missing; falling back.');
    return devPrint('sms', to, code, purpose);
  }

  try {
    const params = new URLSearchParams({
      template_id: MSG91_TEMPLATE_ID,
      mobile: to.replace('+', ''),
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
  } catch (err) {
    console.warn('[OTP Fallback] SMS send failed, falling back:', err.message);
    return devPrint('sms', to, code, purpose);
  }
}

async function sendOtp({ channel, to, code, purpose }) {
  return channel === 'sms' ? sendSmsOtp(to, code, purpose) : sendEmailOtp(to, code, purpose);
}

module.exports = { sendOtp, OTP_MINUTES };