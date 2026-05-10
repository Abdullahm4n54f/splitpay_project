const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: true
    },
    // The user who created the group — they get the admin badge
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Confirmed members
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Users who have been invited but haven't accepted yet
    pendingInvites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Group chat with optional reply support
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        text: {
            type: String,
            required: true
        },
        replyTo: {
            type: Number, // index of the comment being replied to
            default: null
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Group', groupSchema);