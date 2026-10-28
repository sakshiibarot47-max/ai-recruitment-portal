const nodemailer = require('nodemailer');

let transporterPromise = null;

// Creates the mail connection once and reuses it.
// - If SMTP_HOST is set in .env, it uses that real mail server (Mailtrap, Gmail...).
// - Otherwise it uses a free Ethereal test inbox (no signup), and prints a preview link.
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (process.env.SMTP_HOST) {
        const port = Number(process.env.SMTP_PORT) || 587;
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: port === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
      }
      const account = await nodemailer.createTestAccount();
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: account.user, pass: account.pass },
      });
    })();
  }
  return transporterPromise;
}

// Sends one email. It never crashes the API: if sending fails, it only prints the reason.
async function sendMail({ to, subject, text }) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"HireAI Recruitment" <no-reply@hireai.test>',
      to,
      subject,
      text,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Email preview link:', previewUrl);
    else console.log('Email sent to', to);
    return info;
  } catch (err) {
    console.log('Email could not be sent:', err.message);
    return null;
  }
}

module.exports = { sendMail };