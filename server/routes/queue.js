const express = require('express');
const router = express.Router();
const { joinQueue, getQueueStatus, leaveQueue, getMyQueues, getAllQueues, acceptOffer, declineOffer } = require('../controllers/queueController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const { validate, schemas } = require('../middleware/validate');

// All queue routes require authentication
router.use(authenticate);

// POST /api/queue  — join queue
router.post('/', validate(schemas.joinQueue), joinQueue);

// POST /api/queue/accept-offer — accept a slot offer
router.post('/accept-offer', acceptOffer);

// POST /api/queue/decline-offer — decline a slot offer
router.post('/decline-offer', declineOffer);

// GET /api/queue/my-queues — get all active queues for current user
router.get('/my-queues', getMyQueues);

// GET /api/queue/admin/all — admin: all waiting queue entries
router.get('/admin/all', adminOnly, getAllQueues);

// GET /api/queue/:stationId/status  — check queue position
router.get('/:stationId/status', getQueueStatus);

// DELETE /api/queue/:stationId/leave  — leave queue for a station
router.delete('/:stationId/leave', leaveQueue);

// DELETE /api/queue/:id  — leave queue by queue entry id (legacy)
router.delete('/:id', leaveQueue);

module.exports = router;
