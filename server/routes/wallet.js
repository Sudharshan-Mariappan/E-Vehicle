const express = require('express');
const router = express.Router();
const { getWallet, addMoney } = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getWallet);
router.post('/add-money', addMoney);

module.exports = router;
