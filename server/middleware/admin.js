const { AppError } = require('./errorHandler');

/**
 * Middleware to check if the authenticated user is an admin.
 * Must be placed AFTER the `authenticate` middleware.
 */
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        next(new AppError('Access denied. Admins only.', 403));
    }
};

module.exports = { adminOnly };
