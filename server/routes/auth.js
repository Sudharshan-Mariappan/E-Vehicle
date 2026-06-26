const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, getAllUsers, updateUserRole, deleteUser, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { validate, schemas } = require('../middleware/validate');

// POST /api/auth/register
router.post('/register', validate(schemas.register), register);

// POST /api/auth/login
router.post('/login', validate(schemas.login), login);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, getMe);

// PUT /api/auth/profile (protected)
router.put('/profile', authenticate, updateProfile);

// PUT /api/auth/change-password (protected)
router.put('/change-password', authenticate, changePassword);

// Admin Routes
router.get('/users', authenticate, adminOnly, getAllUsers);
router.put('/users/:id/role', authenticate, adminOnly, updateUserRole);
router.delete('/users/:id', authenticate, adminOnly, deleteUser);

module.exports = router;
