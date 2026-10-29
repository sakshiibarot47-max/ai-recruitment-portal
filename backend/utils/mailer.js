const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendMail(options) {
  const { to, email, subject, text, message } = options || {};
  const recipient = to || email;
  const body = text || message;

  // Generate a gorgeous local HTML preview file so you can open it directly in your browser
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 40px; }
        .email-container { max-width: 600px; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
        .header h2 { color: #007bff; margin: 0; }
        .meta { font-size: 14px; color: #555; margin-bottom: 20px; }
        .body-content { font-size: 16px; color: #333; line-height: 1.6; white-space: pre-line; }
        .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h2>HireAI Recruitment Portal</h2>
        </div>
        <div class="meta">
          <strong>To:</strong> ${recipient}<br>
          <strong>Subject:</strong> ${subject}
        </div>
        <div class="body-content">${body}</div>
        <div class="footer">
          <p>This is a simulated local test email for your recruitment application portal.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Save to a local html file in your backend folder
  const filePath = path.join(__dirname, '..', 'email-preview.html');
  fs.writeFileSync(filePath, htmlContent);

  console.log('--------------------------------------------------');
  console.log('📧 Email Generated Successfully!');
  console.log('📂 Local Preview File saved at:');
  console.log(filePath);
  console.log('--------------------------------------------------');

  return { messageId: 'local-' + Date.now() };
}

sendMail.sendMail = sendMail;
sendMail.sendEmail = sendMail;

module.exports = sendMail;