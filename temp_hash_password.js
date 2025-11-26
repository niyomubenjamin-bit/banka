const bcrypt = require('bcryptjs');
const password = 'adminpassword'; // Change this to a strong password
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log(hash);
