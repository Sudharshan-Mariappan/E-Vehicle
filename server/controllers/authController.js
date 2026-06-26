const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/auth/register
 * Register a new user. Returns JWT on success.
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password, phone, vehicle_type } = req.body;

        // Check if email already exists
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return next(new AppError('An account with this email already exists.', 409));
        }

        // Hash password with bcrypt (cost factor 12)
        const password_hash = await bcrypt.hash(password, 12);

        // Insert new user
        const result = await query(
            `INSERT INTO users (name, email, password_hash, phone, vehicle_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, vehicle_type, created_at`,
            [name, email, password_hash, phone || null, vehicle_type || null]
        );

        const user = result.rows[0];

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/login
 * Authenticate user and return JWT.
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Fetch user by email
        const result = await query(
            'SELECT id, name, email, password_hash FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return next(new AppError('Invalid email or password.', 401));
        }

        const user = result.rows[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return next(new AppError('Invalid email or password.', 401));
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res, next) => {
    try {
        const result = await query(
            'SELECT id, name, email, phone, vehicle_type, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return next(new AppError('User not found', 404));
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/auth/profile
 * Update user profile details.
 */
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, vehicle_type } = req.body;
        const userId = req.user.id;

        const result = await query(
            `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           vehicle_type = COALESCE($3, vehicle_type)
       WHERE id = $4
       RETURNING id, name, email, phone, vehicle_type, created_at`,
            [name, phone, vehicle_type, userId]
        );

        if (result.rows.length === 0) {
            return next(new AppError('User not found.', 404));
        }

        res.json({ success: true, message: 'Profile updated successfully', user: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/users
 * (Admin only) Get all users.
 */
const getAllUsers = async (req, res, next) => {
    try {
        const result = await query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/auth/users/:id/role
 * (Admin only) Update user role.
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return next(new AppError('Invalid role', 400));
        }

        const result = await query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, role',
            [role, id]
        );

        if (result.rows.length === 0) return next(new AppError('User not found', 404));

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/auth/users/:id
 * (Admin only) Delete a user.
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) return next(new AppError('User not found', 404));

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/auth/change-password
 * Change the authenticated user's password.
 */
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return next(new AppError('Current and new password are required', 400));
        }
        if (newPassword.length < 6) {
            return next(new AppError('New password must be at least 6 characters', 400));
        }

        const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return next(new AppError('User not found', 404));

        const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
        if (!isMatch) return next(new AppError('Current password is incorrect', 401));

        const newHash = await bcrypt.hash(newPassword, 12);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, getMe, updateProfile, getAllUsers, updateUserRole, deleteUser, changePassword };
