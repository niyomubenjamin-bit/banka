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

  sendTransactionAlert: async (user, transaction, account) => {
    const subject = `Banka Alert: ${transaction.type === 'credit' ? 'Credit' : 'Debit'} Transaction`;
    const text = `Dear ${user.first_name},

A ${transaction.type} transaction of RWF ${Number(transaction.amount).toLocaleString()} has occurred on your account ${account.account_number}.

Description: ${transaction.description || 'N/A'}
New Balance: RWF ${Number(transaction.new_balance).toLocaleString()}

Date: ${new Date(transaction.created_at).toLocaleString()}

Thank you for banking with us.`;
    await sendOtpEmail(user.email, subject, text);
  },

  sendLowBalanceAlert: async (user, account) => {
    const subject = 'Banka Alert: Low Balance Warning';
    const text = `Dear ${user.first_name},

Your account ${account.account_number} balance has dropped below RWF 5,000.
Current Balance: RWF ${Number(account.balance).toLocaleString()}

Please top up your account to avoid service interruptions.

Thank you for banking with us.`;
    await sendOtpEmail(user.email, subject, text);
  },

};
