const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'insecure_dev_secret_change_me';
const DEFAULT_EXPIRES_IN = '1h';

function signToken(payload, options = {}) {
  const opts = { expiresIn: DEFAULT_EXPIRES_IN, ...options };
  return jwt.sign(payload, JWT_SECRET, opts);
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken,
};