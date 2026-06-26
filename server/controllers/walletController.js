const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/wallet
 * Returns current wallet balance and recent transactions.
 */
const getWallet = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get balance
        const userResult = await query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        const balance = userResult.rows[0].wallet_balance;

        // Get transactions
        const txResult = await query(
            'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
            [userId]
        );

        res.json({
            success: true,
            balance: parseFloat(balance),
            transactions: txResult.rows
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/wallet/add-money
 * Simulates adding money to wallet.
 */
const addMoney = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return next(new AppError('Invalid amount', 400));
        }

        // Use transaction to ensure atomicity
        await query('BEGIN');

        // Update balance
        const updateResult = await query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
            [amount, userId]
        );
        const newBalance = updateResult.rows[0].wallet_balance;

        // Record transaction
        await query(
            `INSERT INTO transactions (user_id, amount, type, description)
             VALUES ($1, $2, 'CREDIT', 'Added money to wallet')`,
            [userId, amount]
        );

        await query('COMMIT');

        res.json({
            success: true,
            message: 'Money added successfully',
            balance: parseFloat(newBalance)
        });
    } catch (err) {
        await query('ROLLBACK');
        next(err);
    }
};

module.exports = { getWallet, addMoney };
