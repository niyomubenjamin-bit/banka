// Authentication controller
// Phase 1: implement signup, login, email verification via OTP, and password reset.

const { query } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { sendOtpEmail } = require('../utils/email');
const { _createAccountInternal } = require('./accountController');

const SAFE_USER_FIELDS = [
  'id',
  'email',
  'first_name',
  'last_name',
  'role',
  'email_verified',
  'status',
  'created_at',
  'updated_at',
];

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);

function toSafeUser(row) {
  if (!row) return null;
  return SAFE_USER_FIELDS.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      acc[key] = row[key];
    }
    return acc;
  }, {});
}
function generateOtpCode() {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function logLoginActivity({ userId, email, success, req }) {
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'] || null;

  await query(
    `INSERT INTO login_activity (user_id, email, success, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId || null, email || null, Boolean(success), ipAddress, userAgent],
  );
}

async function createOtp(userId, purpose) {
  const code = generateOtpCode();
  const expiresAtSql = `NOW() + INTERVAL '${OTP_EXPIRY_MINUTES} minutes'`;

  // Ensure purpose is one of the allowed values
  const allowedPurposes = ['verify_email', 'reset_password', 'login_mfa'];
  if (!allowedPurposes.includes(purpose)) {
    throw new Error(`Invalid OTP purpose: ${purpose}`);
  }

  const insertSql = `
    INSERT INTO otps (user_id, code, purpose, expires_at)
    VALUES ($1, $2, $3, ${expiresAtSql})
    RETURNING id, code, purpose, expires_at, created_at;
  `;

  const { rows } = await query(insertSql, [userId, code, purpose]);
  return rows[0];
}

async function invalidateOtp(userId, code, purpose) {
  await query(
    `UPDATE otps SET used_at = NOW() WHERE user_id = $1 AND code = $2 AND purpose = $3 AND used_at IS NULL AND expires_at > NOW()`,
    [userId, code, purpose],
  );
}

async function signup(req, res) {
  try {
    const { firstName, lastName, email, password, accountType } = req.body || {};

    if (!firstName || !lastName || !email || !password || !accountType) {
      return res.status(400).json({
        message: 'firstName, lastName, email, password, and accountType are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await query(
      'SELECT id, email_verified FROM users WHERE email = $1',
      [normalizedEmail],
    );
    if (existing.rowCount > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.email_verified) {
        return res.status(409).json({ message: 'Email is already registered' });
      }
      // If a non-verified user exists, we could resend OTP. For now, return a clear message.
      return res.status(409).json({
        message:
          'Email is already registered but not verified. Please use the OTP sent to your email or request support.',
      });
    }

    const passwordHash = await hashPassword(password);

    const insertSql = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, email_verified, created_at, updated_at;
    `;
    const { rows } = await query(insertSql, [
      normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      'client',
      true, // Set email_verified to true immediately
    ]);

    const user = toSafeUser(rows[0]);

    // Create a bank account for the new user
    const bankAccount = await _createAccountInternal(user.id, accountType);

    // Send a separate email with account details
    const accountEmailSubject = 'Banka - Your New Account Details';
    const accountEmailText = `Welcome to Banka, ${user.first_name}!
Your new ${bankAccount.type} account has been created with account number: ${bankAccount.account_number}.
You can now log in to manage your finances.`;
    await sendOtpEmail(user.email, accountEmailSubject, accountEmailText); // Re-using sendOtpEmail for simplicity, though it's not an OTP.

    return res.status(201).json({
      message: 'Signup successful. Your bank account has been created and details sent to your email.',
    });
  } catch (err) {
    console.error('Error in signup handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyEmailOtp(req, res) {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ message: 'email and otp are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { rows: userRows } = await query(
      'SELECT id, email, first_name, last_name, role, email_verified, created_at, updated_at FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRow = userRows[0];

    if (userRow.email_verified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const { rows: otpRows } = await query(
      `SELECT id, code, purpose, expires_at, used_at FROM otps
       WHERE user_id = $1 AND code = $2 AND purpose = $3
         AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userRow.id, String(otp).trim(), 'verify_email'],
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await query('UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1', [
      userRow.id,
    ]);

    await invalidateOtp(userRow.id, otpRows[0].code, 'verify_email');

    const user = toSafeUser({ ...userRow, email_verified: true });
    const token = signToken({ id: user.id, role: user.role });

    return res.status(200).json({
      message: 'Email verified successfully',
      user,
      token,
    });
  } catch (err) {
    console.error('Error in verifyEmailOtp handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: 'email and password are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { rows } = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, email_verified, status, created_at, updated_at FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (rows.length === 0) {
      await logLoginActivity({
        userId: null,
        email: normalizedEmail,
        success: false,
        req,
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const dbUser = rows[0];

    const passwordMatches = await comparePassword(password, dbUser.password_hash);
    if (!passwordMatches) {
      await logLoginActivity({
        userId: dbUser.id,
        email: dbUser.email,
        success: false,
        req,
      });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!dbUser.email_verified) {
      await logLoginActivity({
        userId: dbUser.id,
        email: dbUser.email,
        success: false,
        req,
      });
      return res.status(403).json({
        message: 'Email not verified. Please verify your email using the OTP sent to you.',
      });
    }

    if (dbUser.status !== 'active') {
      await logLoginActivity({
        userId: dbUser.id,
        email: dbUser.email,
        success: false,
        req,
      });
      return res.status(403).json({
        message: 'User account is not active. Please contact support or an administrator.',
      });
    }

    // Password is correct, now send OTP for MFA
    const otp = await createOtp(dbUser.id, 'login_mfa');
    const subject = 'Banka - Login Verification Code';
    const text = `Your Banka login verification code is ${otp.code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
    await sendOtpEmail(dbUser.email, subject, text);

    await logLoginActivity({
      userId: dbUser.id,
      email: dbUser.email,
      success: true, // Mark as success for password verification, OTP pending
      req,
    });

    // Inform the client that an OTP is required
    return res.status(202).json({
      message: 'OTP sent to your email. Please verify to complete login.',
      email: normalizedEmail,
    });
  } catch (err) {
    console.error('Error in login handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function forgotPasswordRequest(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ message: 'email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { rows: userRows } = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (userRows.length === 0) {
      // Do not reveal whether the email exists; respond generically.
      return res.status(200).json({
        message:
          'If an account with that email exists, a password reset code has been sent.',
      });
    }

    const userRow = userRows[0];

    const otp = await createOtp(userRow.id, 'reset_password');
    const subject = 'Banka - Password Reset Code';
    const text = `Your Banka password reset code is ${otp.code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
    await sendOtpEmail(userRow.email, subject, text);

    return res.status(200).json({
      message:
        'If an account with that email exists, a password reset code has been sent.',
    });
  } catch (err) {
    console.error('Error in forgotPasswordRequest handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function resetPasswordWithOtp(req, res) {
  try {
    const { email, otp, newPassword } = req.body || {};

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: 'email, otp, and newPassword are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { rows: userRows } = await query(
      'SELECT id, email, first_name, last_name, role, email_verified, created_at, updated_at FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (userRows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    const userRow = userRows[0];

    const { rows: otpRows } = await query(
      `SELECT id, code, purpose, expires_at, used_at FROM otps
       WHERE user_id = $1 AND code = $2 AND purpose = $3
         AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userRow.id, String(otp).trim(), 'reset_password'],
    );

    if (otpRows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const passwordHash = await hashPassword(newPassword);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userRow.id],
    );

    await invalidateOtp(userRow.id, otpRows[0].code, 'reset_password');

    const user = toSafeUser(userRow);
    const token = signToken({ id: user.id, role: user.role });

    return res.status(200).json({
      message: 'Password reset successfully',
      user,
      token,
    });
  } catch (err) {
    console.error('Error in resetPasswordWithOtp handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCurrentUserProfile(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { rows } = await query(
      `SELECT id, email, first_name, last_name, role, email_verified, status, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = toSafeUser(rows[0]);
    return res.status(200).json({ user });
  } catch (err) {
    console.error('Error in getCurrentUserProfile handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateCurrentUserProfile(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { firstName, lastName } = req.body || {};

    if (!firstName && !lastName) {
      return res.status(400).json({
        message: 'At least one of firstName or lastName is required',
      });
    }

    const fields = [];
    const params = [];
    let idx = 1;

    if (firstName) {
      fields.push(`first_name = $${idx}`);
      params.push(firstName);
      idx += 1;
    }

    if (lastName) {
      fields.push(`last_name = $${idx}`);
      params.push(lastName);
      idx += 1;
    }

    fields.push(`updated_at = NOW()`);

    const sql = `
      UPDATE users
         SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, email, first_name, last_name, role, email_verified, status, created_at, updated_at
    `;
    params.push(userId);

    const { rows } = await query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = toSafeUser(rows[0]);
    return res.status(200).json({ user });
  } catch (err) {
    console.error('Error in updateCurrentUserProfile handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function changePasswordAuthenticated(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'currentPassword and newPassword are required',
      });
    }

    const { rows } = await query(
      'SELECT id, email, password_hash FROM users WHERE id = $1',
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const dbUser = rows[0];

    const matches = await comparePassword(currentPassword, dbUser.password_hash);
    if (!matches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await hashPassword(newPassword);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId],
    );

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Error in changePasswordAuthenticated handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getLoginActivity(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const limit = Number(req.query.limit || 20) || 20;

    const { rows } = await query(
      `SELECT id, success, ip_address, user_agent, created_at
       FROM login_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    return res.status(200).json({ activity: rows });
  } catch (err) {
    console.error('Error in getLoginActivity handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createUserByAdmin(req, res) {
  try {
    const { firstName, lastName, email, password, role } = req.body || {};

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        message:
          'firstName, lastName, email, password, and role are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedRole = String(role).trim().toLowerCase();

    if (!['staff', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({
        message: "Invalid role. Expected 'staff' or 'admin'",
      });
    }

    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await hashPassword(password);

    const insertSql = `
      INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, role, email_verified, status, created_at, updated_at;
    `;

    const { rows } = await query(insertSql, [
      normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      normalizedRole,
      false,
      'active',
    ]);

    const user = toSafeUser(rows[0]);

    // Send a verification OTP to the staff/admin user so they can verify their email.
    const otp = await createOtp(user.id, 'verify_email');
    const subject = 'Banka - Staff/Admin Account Verification Code';
    const text = `An administrator created an account for you on Banka. Your verification code is ${otp.code}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`;
    await sendOtpEmail(user.email, subject, text);

    return res.status(201).json({
      message:
        'User created successfully. The user must verify their email using the OTP sent to them.',
      user,
    });
  } catch (err) {
    console.error('Error in createUserByAdmin handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyLoginOtp(req, res) {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({ message: 'email and otp are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const { rows: userRows } = await query(
      'SELECT id, email, first_name, last_name, role, email_verified, status, created_at, updated_at FROM users WHERE email = $1',
      [normalizedEmail],
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRow = userRows[0];

    const { rows: otpRows } = await query(
      `SELECT id, code, purpose, expires_at, used_at FROM otps
       WHERE user_id = $1 AND code = $2 AND purpose = $3
         AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userRow.id, String(otp).trim(), 'login_mfa'],
    );

    if (otpRows.length === 0) {
      // Log failed OTP attempt
      await logLoginActivity({
        userId: userRow.id,
        email: userRow.email,
        success: false,
        req,
      });
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Invalidate the OTP now that it's used
    await invalidateOtp(userRow.id, otpRows[0].code, 'login_mfa');

    // Log successful login after MFA
    await logLoginActivity({
      userId: userRow.id,
      email: userRow.email,
      success: true,
      req,
    });

    // Generate token and return user details
    const user = toSafeUser(userRow);
    const token = signToken({ id: user.id, role: user.role });

    return res.status(200).json({
      message: 'Login successful',
      user,
      token,
    });
  } catch (err) {
    console.error('Error in verifyLoginOtp handler', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  signup,
  verifyEmailOtp,
  login,
  forgotPasswordRequest,
  resetPasswordWithOtp,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changePasswordAuthenticated,
  getLoginActivity,
  createUserByAdmin,
  verifyLoginOtp, // Add this new function to exports
};
