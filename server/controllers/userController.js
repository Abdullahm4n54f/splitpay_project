const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── AUTH ────────────────────────────────────────────────────────────────────

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        console.log("Error in registerUser: ", error);
        res.status(500).json({ message: "Server error during registration" });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar }
        });
    } catch (error) {
        console.log("Error in loginUser: ", error);
        res.status(500).json({ message: "Server error during login" });
    }
};

// ─── SEARCH ──────────────────────────────────────────────────────────────────

// Search by name OR email (more flexible than email-only)
const searchUsers = async (req, res) => {
    try {
        const searchTerm = req.query.q || req.query.email || '';
        if (!searchTerm.trim()) {
            return res.status(400).json({ message: "Search term is required" });
        }

        const users = await User.find({
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ],
            _id: { $ne: req.user?.userId } // exclude self if authenticated
        }).select('-password -friendRequests');

        res.status(200).json(users);
    } catch (error) {
        console.log("Error searching users: ", error);
        res.status(500).json({ message: "Error searching for users" });
    }
};

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

// GET /api/users/friends — get friends list and pending incoming requests
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate('friends', 'name email avatar')
            .populate('friendRequests', 'name email avatar');

        res.status(200).json({
            friends: user.friends,
            friendRequests: user.friendRequests
        });
    } catch (error) {
        console.log("Error in getFriends:", error);
        res.status(500).json({ message: "Error fetching friends" });
    }
};

// POST /api/users/friend-request — send a friend request by target user ID
const sendFriendRequest = async (req, res) => {
    try {
        const { targetUserId } = req.body;
        const senderId = req.user.userId;

        if (targetUserId === senderId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).json({ message: "User not found" });

        // Don't add duplicate requests
        const alreadySent = targetUser.friendRequests.some(id => id.toString() === senderId);
        const alreadyFriends = targetUser.friends.some(id => id.toString() === senderId);

        if (alreadySent) return res.status(400).json({ message: "Friend request already sent" });
        if (alreadyFriends) return res.status(400).json({ message: "Already friends" });

        targetUser.friendRequests.push(senderId);
        await targetUser.save();

        res.status(200).json({ message: "Friend request sent!" });
    } catch (error) {
        console.log("Error in sendFriendRequest:", error);
        res.status(500).json({ message: "Error sending friend request" });
    }
};

// POST /api/users/accept-friend — accept a friend request
const acceptFriendRequest = async (req, res) => {
    try {
        const { requesterId } = req.body; // the person who sent the request
        const acceptorId = req.user.userId;

        const acceptor = await User.findById(acceptorId);
        const requester = await User.findById(requesterId);

        if (!requester) return res.status(404).json({ message: "User not found" });

        // Remove from pending requests
        acceptor.friendRequests = acceptor.friendRequests.filter(
            id => id.toString() !== requesterId
        );

        // Add to each other's friends list (avoid duplicates)
        if (!acceptor.friends.some(id => id.toString() === requesterId)) {
            acceptor.friends.push(requesterId);
        }
        if (!requester.friends.some(id => id.toString() === acceptorId)) {
            requester.friends.push(acceptorId);
        }

        await acceptor.save();
        await requester.save();

        // Return the updated friends list with populated data
        const updatedUser = await User.findById(acceptorId)
            .populate('friends', 'name email avatar')
            .populate('friendRequests', 'name email avatar');

        res.status(200).json({
            message: "Friend request accepted!",
            friends: updatedUser.friends,
            friendRequests: updatedUser.friendRequests
        });
    } catch (error) {
        console.log("Error in acceptFriendRequest:", error);
        res.status(500).json({ message: "Error accepting friend request" });
    }
};

// POST /api/users/decline-friend — decline/cancel a friend request
const declineFriendRequest = async (req, res) => {
    try {
        const { requesterId } = req.body;
        const userId = req.user.userId;

        await User.findByIdAndUpdate(userId, {
            $pull: { friendRequests: requesterId }
        });

        res.status(200).json({ message: "Friend request declined" });
    } catch (error) {
        console.log("Error in declineFriendRequest:", error);
        res.status(500).json({ message: "Error declining friend request" });
    }
};

// ─── SETTINGS ────────────────────────────────────────────────────────────────

// PUT /api/users/settings — update profile info
const updateSettings = async (req, res) => {
    try {
        const { name, avatar, currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Update name and avatar if provided
        if (name && name.trim()) user.name = name.trim();
        if (avatar && avatar.trim()) user.avatar = avatar.trim();

        // Handle password change — MUST hash the new password before saving
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Please provide your current password to change it" });
            }
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: "New password must be at least 6 characters" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt); // ALWAYS hash before saving!
        }

        await user.save();

        res.status(200).json({
            message: "Settings updated successfully!",
            user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar }
        });
    } catch (error) {
        console.log("Error in updateSettings:", error);
        res.status(500).json({ message: "Error updating settings" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    searchUsers,
    getFriends,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    updateSettings
};