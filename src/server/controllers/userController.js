const { query } = require('../config/db');

async function getAllUsers(req, res) {
    try {
        const { rows } = await query(
            `SELECT id, email, first_name, last_name, role, status, email_verified, created_at
       FROM users
       ORDER BY created_at DESC`,
        );
        return res.status(200).json({ users: rows });
    } catch (err) {
        console.error('Error in getAllUsers handler', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getUserById(req, res) {
    try {
        const { userId } = req.params;
        const { rows } = await query(
            `SELECT id, email, first_name, last_name, role, status, email_verified, created_at
       FROM users
       WHERE id = $1`,
            [userId],
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ user: rows[0] });
    } catch (err) {
        console.error('Error in getUserById handler', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = {
    getAllUsers,
    getUserById,
};
