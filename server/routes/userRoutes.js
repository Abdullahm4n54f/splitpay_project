const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// ─── PUBLIC ROUTES (no auth needed) ──────────────────────────────────────────
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// ─── SEARCH (auth optional — protect adds user if token present) ──────────────
router.get('/search', protect, userController.searchUsers);

// ─── FRIENDS (auth required) ─────────────────────────────────────────────────
router.get('/friends', protect, userController.getFriends);
router.post('/friend-request', protect, userController.sendFriendRequest);
router.post('/accept-friend', protect, userController.acceptFriendRequest);
router.post('/decline-friend', protect, userController.declineFriendRequest);

// ─── SETTINGS (auth required) ────────────────────────────────────────────────
router.put('/settings', protect, userController.updateSettings);

module.exports = router;