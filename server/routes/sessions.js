const express = require('express');
const router = express.Router();
const { getActiveSession, getSessionHistory } = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

// All session routes require authentication
router.use(authenticate);

// GET /api/sessions/active
router.get('/active', getActiveSession);

// GET /api/sessions/history
router.get('/history', getSessionHistory);

module.exports = router;
