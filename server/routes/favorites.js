const express = require('express');
const router = express.Router();
const { getFavorites, toggleFavorite } = require('../controllers/favoriteController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getFavorites);
router.post('/:stationId', toggleFavorite);

module.exports = router;
