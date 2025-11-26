const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../utils/email');

router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    await sendContactEmail(name, email, subject, message);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
});

module.exports = router;
