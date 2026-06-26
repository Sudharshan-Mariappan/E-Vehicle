const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.use(authenticate);
router.use(adminOnly);

router.get('/', getStats);

module.exports = router;
