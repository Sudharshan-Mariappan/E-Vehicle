const express = require('express');
const router = express.Router();
const { addReview, getStationReviews, deleteReview, respondToReview } = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { validate, schemas } = require('../middleware/validate');

// GET /api/reviews/:stationId (Public)
router.get('/:stationId', getStationReviews);

// POST /api/reviews (Protected)
router.post('/', authenticate, validate(schemas.addReview), addReview);

// DELETE /api/reviews/:id (Admin only)
router.delete('/:id', authenticate, adminOnly, deleteReview);

// PUT /api/reviews/:id/response (Admin only)
router.put('/:id/response', authenticate, adminOnly, respondToReview);

module.exports = router;
