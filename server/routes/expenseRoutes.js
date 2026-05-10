const express = require('express');
const router = express.Router();
const ec = require('../controllers/expenseController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, ec.addExpense);
router.get('/:groupId', protect, ec.getGroupExpenses);
router.put('/approve/:id', protect, ec.approveExpense);
router.put('/settle/:id', protect, ec.settlePayment);

module.exports = router;