const Group = require('../models/Group');
const Expense = require('../models/Expense');

// ─── CREATE ──────────────────────────────────────────────────────────────────

const createGroup = async (req, res) => {
    try {
        const { groupName, members } = req.body;
        let allMembers = [...members];

        if (!allMembers.includes(req.user.userId)) {
            allMembers.push(req.user.userId);
        }

        const newGroup = new Group({
            groupName,
            members: allMembers,
            admin: req.user.userId // creator is admin
        });

        await newGroup.save();

        // Return populated so frontend has member names
        const populated = await Group.findById(newGroup._id)
            .populate('members', 'name email avatar')
            .populate('admin', 'name email avatar');

        res.status(201).json(populated);
    } catch (error) {
        console.log("Error creating group: ", error);
        res.status(500).json({ message: "Server error creating group" });
    }
};

// ─── READ ────────────────────────────────────────────────────────────────────

const getUserGroups = async (req, res) => {
    try {
        const groups = await Group.find({ members: req.user.userId })
            .populate('members', 'name email avatar')
            .populate('admin', 'name email avatar');
        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ message: "Error fetching groups" });
    }
};

const getGroupDetails = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id)
            .populate('members', 'name email avatar')
            .populate('admin', 'name email avatar')
            .populate('pendingInvites', 'name email avatar')
            .populate('comments.user', 'name avatar');

        if (!group) return res.status(404).json({ message: "Group not found" });
        res.status(200).json(group);
    } catch (error) {
        console.log("Error fetching group details: ", error);
        res.status(500).json({ message: "Error fetching group details" });
    }
};

// ─── COMMENTS / CHAT ─────────────────────────────────────────────────────────

const addComment = async (req, res) => {
    try {
        const { groupId, text, replyTo } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        group.comments.push({
            user: req.user.userId,
            text: text.trim(),
            replyTo: replyTo != null ? replyTo : null
        });

        await group.save();

        const updatedGroup = await Group.findById(groupId)
            .populate('members', 'name email avatar')
            .populate('admin', 'name email avatar')
            .populate('pendingInvites', 'name email avatar')
            .populate('comments.user', 'name avatar');

        res.status(200).json(updatedGroup);
    } catch (error) {
        console.log("Error adding comment: ", error);
        res.status(500).json({ message: "Server error adding comment" });
    }
};

// ─── INVITES ─────────────────────────────────────────────────────────────────

// POST /api/groups/invite — admin invites a user to the group
const inviteToGroup = async (req, res) => {
    try {
        const { groupId, userId } = req.body;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // Only admin can invite
        if (group.admin.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Only the group admin can invite members" });
        }

        // Check if already a member or already invited
        if (group.members.some(m => m.toString() === userId)) {
            return res.status(400).json({ message: "User is already a member" });
        }
        if (group.pendingInvites.some(m => m.toString() === userId)) {
            return res.status(400).json({ message: "Invite already sent" });
        }

        group.pendingInvites.push(userId);
        await group.save();

        const updated = await Group.findById(groupId)
            .populate('members', 'name email avatar')
            .populate('admin', 'name email avatar')
            .populate('pendingInvites', 'name email avatar')
            .populate('comments.user', 'name avatar');

        res.status(200).json(updated);
    } catch (error) {
        console.log("Error inviting to group:", error);
        res.status(500).json({ message: "Error inviting user" });
    }
};

// POST /api/groups/accept-invite — user accepts an invite
const acceptGroupInvite = async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user.userId;

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // Must be in pending invites
        if (!group.pendingInvites.some(m => m.toString() === userId)) {
            return res.status(400).json({ message: "No pending invite found" });
        }

        // Move from pendingInvites to members
        group.pendingInvites = group.pendingInvites.filter(m => m.toString() !== userId);
        group.members.push(userId);
        await group.save();

        res.status(200).json({ message: "Invite accepted!" });
    } catch (error) {
        console.log("Error accepting invite:", error);
        res.status(500).json({ message: "Error accepting invite" });
    }
};

// POST /api/groups/decline-invite — user declines an invite
const declineGroupInvite = async (req, res) => {
    try {
        const { groupId } = req.body;
        const userId = req.user.userId;

        await Group.findByIdAndUpdate(groupId, {
            $pull: { pendingInvites: userId }
        });

        res.status(200).json({ message: "Invite declined" });
    } catch (error) {
        console.log("Error declining invite:", error);
        res.status(500).json({ message: "Error declining invite" });
    }
};

// GET /api/groups/my-invites — get all groups where user has a pending invite
const getMyInvites = async (req, res) => {
    try {
        const groups = await Group.find({ pendingInvites: req.user.userId })
            .populate('admin', 'name email avatar')
            .populate('members', 'name');

        res.status(200).json(groups);
    } catch (error) {
        console.log("Error getting invites:", error);
        res.status(500).json({ message: "Error fetching invites" });
    }
};

// ─── BALANCES ────────────────────────────────────────────────────────────────

// GET /api/groups/:id/balances — calculate per-member balance for a group
const getGroupBalances = async (req, res) => {
    try {
        const groupId = req.params.id;

        const group = await Group.findById(groupId).populate('members', 'name email avatar');
        if (!group) return res.status(404).json({ message: "Group not found" });

        const expenses = await Expense.find({ groupId });

        // Initialize balances: positive = owed money, negative = owes money
        const balances = {};
        group.members.forEach(m => {
            balances[m._id.toString()] = { user: m, net: 0 };
        });

        expenses.forEach(exp => {
            const payerId = exp.paidBy.toString();
            if (balances[payerId]) {
                balances[payerId].net += exp.amount; // payer is owed the full amount
            }
            exp.splits.forEach(split => {
                const splitUserId = split.user.toString();
                if (balances[splitUserId]) {
                    balances[splitUserId].net -= split.amountOwed; // each person owes their split
                }
            });
        });

        res.status(200).json(Object.values(balances));
    } catch (error) {
        console.log("Error computing balances:", error);
        res.status(500).json({ message: "Error computing balances" });
    }
};

// ─── DELETE ──────────────────────────────────────────────────────────────────

// DELETE /api/groups/:id — delete a group and its expenses
const deleteGroup = async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) return res.status(404).json({ message: "Group not found" });

        // Only the admin can delete the group
        if (group.admin.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Only the admin can delete this group" });
        }

        // Delete all expenses associated with the group
        await Expense.deleteMany({ groupId });

        // Delete the group
        await Group.findByIdAndDelete(groupId);

        res.status(200).json({ message: "Group and its expenses deleted successfully" });
    } catch (error) {
        console.log("Error deleting group:", error);
        res.status(500).json({ message: "Server error deleting group" });
    }
};

module.exports = {
    createGroup,
    getUserGroups,
    getGroupDetails,
    addComment,
    inviteToGroup,
    acceptGroupInvite,
    declineGroupInvite,
    getMyInvites,
    getGroupBalances,
    deleteGroup
};