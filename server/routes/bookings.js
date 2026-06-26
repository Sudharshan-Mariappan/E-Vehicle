const express = require('express');
const router = express.Router();
const {
    createBookingHandler,
    completeBookingHandler,
    cancelBookingHandler,
    getMyBookings,
    getAllBookings
} = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { validate, schemas } = require('../middleware/validate');

// All booking routes require authentication
router.use(authenticate);

// GET /api/bookings/my
router.get('/my', getMyBookings);

// GET /api/bookings/all (Admin only)
router.get('/all', adminOnly, getAllBookings);

// POST /api/bookings
router.post('/', validate(schemas.createBooking), createBookingHandler);

// PUT /api/bookings/:id/complete
router.put('/:id/complete', validate(schemas.completeBooking), completeBookingHandler);

// PUT /api/bookings/:id/cancel
router.put('/:id/cancel', cancelBookingHandler);

module.exports = router;
