const express = require('express');
const router = express.Router();
const gc = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

// ─── STATIC routes MUST come before /:id to avoid Express treating them as IDs ─

// Chat
router.post('/comment', protect, gc.addComment);

// Invites
router.post('/invite', protect, gc.inviteToGroup);
router.post('/accept-invite', protect, gc.acceptGroupInvite);
router.post('/decline-invite', protect, gc.declineGroupInvite);
router.get('/my-invites', protect, gc.getMyInvites);

// CRUD
router.post('/', protect, gc.createGroup);
router.get('/', protect, gc.getUserGroups);

// ─── DYNAMIC routes with :id ────────────────────────────────────────────────
router.get('/:id', protect, gc.getGroupDetails);
router.get('/:id/balances', protect, gc.getGroupBalances);

module.exports = router;