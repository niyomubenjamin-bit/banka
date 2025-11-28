const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
} else {
  console.warn(
    'EMAIL_USER or EMAIL_PASS not set; OTP emails will be logged to console instead of sent.',
  );
}

async function sendOtpEmail(to, subject, text) {
  if (!transporter) {
    console.log('[DEV EMAIL]', { to, subject, text });
    return;
  }

  await transporter.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    text,
  });
}

async function sendContactEmail(name, userEmail, subject, message) {
  if (!transporter) {
    console.log('[DEV EMAIL]', { name, userEmail, subject, message });
    return;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_USER, // Send from our authenticated address
      replyTo: userEmail, // Allow replying to the user
      to: EMAIL_USER, // Send to support (ourselves)
      subject: `Contact Form: ${subject}`,
      text: `Name: ${name}\nEmail: ${userEmail}\n\nMessage:\n${message}`,
    });
  } catch (error) {
    console.error('Error sending contact email:', error);
    throw error;
  }
}



module.exports = {

  sendOtpEmail,

  sendContactEmail,

};
