const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

const { query } = require('../config/db');

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token from the Authorization header.
 * Attaches the decoded user payload to req.user.
 */
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Authentication required. Please provide a valid token.', 401));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user still exists in DB to avoid FK violations
        const userRes = await query('SELECT id, email, name, role FROM users WHERE id = $1', [decoded.id]);
        if (userRes.rows.length === 0) {
            return next(new AppError('User account no longer exists. Please log in again.', 401));
        }

        req.user = userRes.rows[0];
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new AppError('Token expired. Please log in again.', 401));
        }
        return next(new AppError('Invalid token. Please log in again.', 401));
    }
};

/**
 * Admin-only middleware
 * Must be used AFTER authenticate.
 */
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return next(new AppError('Admin access required.', 403));
    }
    next();
};

module.exports = { authenticate, adminOnly };
