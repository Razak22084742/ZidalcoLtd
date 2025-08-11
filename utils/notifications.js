const nodemailer = require('nodemailer');
require('dotenv').config();

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP env vars not fully set. Emails will be logged instead of sent.');
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

async function sendEmail(emailData) {
  const transporter = getTransport();
  const { sender_name, sender_email, sender_phone, message, recipient_email } = emailData;

  const mailOptions = {
    from: sender_email,
    to: recipient_email,
    subject: `New Message from Zidalco Website - ${sender_name}`,
    html: `
      <h2>New Message from Zidalco Website</h2>
      <p><strong>Name:</strong> ${sender_name}</p>
      <p><strong>Email:</strong> ${sender_email}</p>
      <p><strong>Phone:</strong> ${sender_phone}</p>
      <p><strong>Message:</strong></p>
      <p>${(message || '').replace(/\n/g, '<br>')}</p>
      <hr>
      <p><em>Sent from the Zidalco contact form.</em></p>
    `
  };

  if (!transporter) {
    console.log('Email (not sent, missing SMTP):', mailOptions);
    return { queued: true };
  }

  await transporter.sendMail(mailOptions);
  return { queued: false };
}

async function sendAdminNotification(type, payload) {
  // Placeholder: in production you might push to a queue or use email/slack, etc.
  console.log('Admin notification:', { type, payload });
}

module.exports = { sendEmail, sendAdminNotification };
