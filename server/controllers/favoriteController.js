const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/favorites
 * Get all favorite stations for the logged-in user.
 */
const getFavorites = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await query(
            `SELECT s.*, f.created_at as favorited_at 
             FROM favorites f
             JOIN stations s ON f.station_id = s.id
             WHERE f.user_id = $1
             ORDER BY f.created_at DESC`,
            [userId]
        );
        res.json({ success: true, favorites: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/favorites/:stationId
 * Toggle favorite status (Add if not exists, remove if exists).
 */
const toggleFavorite = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { stationId } = req.params;

        // Check if exists
        const existing = await query(
            'SELECT id FROM favorites WHERE user_id = $1 AND station_id = $2',
            [userId, stationId]
        );

        if (existing.rows.length > 0) {
            // Remove
            await query('DELETE FROM favorites WHERE id = $1', [existing.rows[0].id]);
            return res.json({ success: true, favorited: false, message: 'Removed from favorites' });
        } else {
            // Add
            await query(
                'INSERT INTO favorites (user_id, station_id) VALUES ($1, $2)',
                [userId, stationId]
            );
            return res.json({ success: true, favorited: true, message: 'Added to favorites' });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = { getFavorites, toggleFavorite };
