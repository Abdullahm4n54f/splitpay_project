const Expense = require('../models/Expense');
const Group = require('../models/Group');

// Add a new expense — auto-approved if admin, pending if member
const addExpense = async (req, res) => {
    try {
        const { description, amount, groupId, splits, attachment } = req.body;

        if (amount <= 0) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }

        // Validate splits add up
        let calculatedTotal = 0;
        for (let i = 0; i < splits.length; i++) {
            calculatedTotal += Number(splits[i].amountOwed);
        }
        if (Math.abs(calculatedTotal - amount) > 0.01) {
            return res.status(400).json({ message: "The split amounts do not equal the total bill" });
        }

        // Check if the user is the group admin
        const group = await Group.findById(groupId);
        const isAdmin = group && group.admin && group.admin.toString() === req.user.userId;

        const newExpense = new Expense({
            description,
            amount,
            paidBy: req.user.userId,
            groupId,
            splits,
            attachment: attachment || null,
            status: isAdmin ? 'approved' : 'pending', // auto-approve for admin
            settledSplits: []
        });

        await newExpense.save();

        // Return populated
        const populated = await Expense.findById(newExpense._id)
            .populate('paidBy', 'name avatar')
            .populate('splits.user', 'name');

        res.status(201).json(populated);
    } catch (error) {
        console.log("Error adding expense: ", error);
        res.status(500).json({ message: "Server error adding expense" });
    }
};

// Get all expenses for a group
const getGroupExpenses = async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const expenses = await Expense.find({ groupId })
            .populate('paidBy', 'name avatar')
            .populate('splits.user', 'name')
            .populate('settledSplits', 'name')
            .sort({ date: -1 });

        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ message: "Error fetching expenses" });
    }
};

// Admin approves a pending expense
const approveExpense = async (req, res) => {
    try {
        const expenseId = req.params.id;
        const expense = await Expense.findById(expenseId);
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        // Verify caller is group admin
        const group = await Group.findById(expense.groupId);
        if (!group || group.admin.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Only the group admin can approve bills" });
        }

        expense.status = 'approved';
        await expense.save();

        const populated = await Expense.findById(expenseId)
            .populate('paidBy', 'name avatar')
            .populate('splits.user', 'name')
            .populate('settledSplits', 'name');

        res.status(200).json(populated);
    } catch (error) {
        console.log("Error approving expense:", error);
        res.status(500).json({ message: "Error approving expense" });
    }
};

// Admin settles a member's split (marks them as paid)
const settlePayment = async (req, res) => {
    try {
        const expenseId = req.params.id;
        const { userId } = req.body; // the member being settled

        const expense = await Expense.findById(expenseId);
        if (!expense) return res.status(404).json({ message: "Expense not found" });

        const group = await Group.findById(expense.groupId);
        if (!group || group.admin.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Only the group admin can settle payments" });
        }

        // Add to settledSplits if not already there
        if (!expense.settledSplits.some(id => id.toString() === userId)) {
            expense.settledSplits.push(userId);
        }

        await expense.save();

        const populated = await Expense.findById(expenseId)
            .populate('paidBy', 'name avatar')
            .populate('splits.user', 'name')
            .populate('settledSplits', 'name');

        res.status(200).json(populated);
    } catch (error) {
        console.log("Error settling payment:", error);
        res.status(500).json({ message: "Error settling payment" });
    }
};

module.exports = { addExpense, getGroupExpenses, approveExpense, settlePayment };