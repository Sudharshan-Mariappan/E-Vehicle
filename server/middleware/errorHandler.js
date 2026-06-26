/**
 * Custom application error class.
 * Allows controllers to throw errors with specific HTTP status codes.
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Distinguishes from unexpected errors
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Centralized error handling middleware.
 * Must be registered LAST in Express middleware chain.
 */
const errorHandler = (err, req, res, next) => {
    let { statusCode = 500, message } = err;

    // PostgreSQL unique violation
    if (err.code === '23505') {
        statusCode = 409;
        message = 'A record with this information already exists.';
    }

    // PostgreSQL foreign key violation
    if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced resource does not exist.';
    }

    // JWT errors (shouldn't reach here normally, but just in case)
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid authentication token.';
    }

    // Log unexpected errors in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('💥 Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        error: message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = { AppError, errorHandler };
