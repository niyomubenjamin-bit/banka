const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(plainPassword) {
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  return bcrypt.hashSync(String(plainPassword), salt);
}

async function comparePassword(plainPassword, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(String(plainPassword), hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
