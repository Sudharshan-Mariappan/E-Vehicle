const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/reviews
 * Add a review for a station.
 */
const addReview = async (req, res, next) => {
    try {
        const { stationId, rating, comment } = req.body;
        const userId = req.user.id;

        // Check if user has actually used this station (completed booking)
        const bookingCheck = await query(
            `SELECT id FROM bookings
       WHERE user_id = $1 AND station_id = $2 AND status = 'completed'
       LIMIT 1`,
            [userId, stationId]
        );

        if (bookingCheck.rows.length === 0) {
            return next(new AppError('You can only review stations you have used.', 403));
        }

        // Check if already reviewed
        const reviewCheck = await query(
            `SELECT id FROM reviews WHERE user_id = $1 AND station_id = $2`,
            [userId, stationId]
        );

        if (reviewCheck.rows.length > 0) {
            return next(new AppError('You have already reviewed this station.', 409));
        }

        await query(
            `INSERT INTO reviews (user_id, station_id, rating, comment)
       VALUES ($1, $2, $3, $4)`,
            [userId, stationId, rating, comment]
        );

        // Update station average rating
        await query(
            `UPDATE stations
       SET rating = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE station_id = $1)
       WHERE id = $1`,
            [stationId]
        );

        res.status(201).json({ success: true, message: 'Review added successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/reviews/:stationId
 * Get recent reviews for a station.
 */
const getStationReviews = async (req, res, next) => {
    try {
        const { stationId } = req.params;

        const result = await query(
            `SELECT r.*, u.name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.station_id = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
            [stationId]
        );

        res.json({ success: true, reviews: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/reviews/:id
 * (Admin only) Delete a review by ID.
 */
const deleteReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM reviews WHERE id = $1 RETURNING id, station_id', [id]);
        if (result.rows.length === 0) return next(new AppError('Review not found', 404));

        // Recalculate station rating after deletion
        const { station_id } = result.rows[0];
        await query(
            `UPDATE stations
             SET rating = COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE station_id = $1), 0)
             WHERE id = $1`,
            [station_id]
        );

        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/reviews/:id/response
 * (Admin only) Add or update admin response to a review.
 */
const respondToReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { response } = req.body;

        const result = await query(
            `UPDATE reviews SET admin_response = $1 WHERE id = $2 RETURNING id`,
            [response, id]
        );

        if (result.rows.length === 0) return next(new AppError('Review not found', 404));

        res.json({ success: true, message: 'Response saved' });
    } catch (err) {
        next(err);
    }
};

module.exports = { addReview, getStationReviews, deleteReview, respondToReview };
