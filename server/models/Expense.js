const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    // Receipt/attachment image (base64 data URL or external URL)
    attachment: {
        type: String,
        default: null
    },
    // Approval workflow: pending → approved → (splits get settled individually)
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending'
    },
    // Track which members have settled (paid) their portion
    settledSplits: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Split breakdown
    splits: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        amountOwed: {
            type: Number,
            required: true
        }
    }]
});

module.exports = mongoose.model('Expense', expenseSchema);