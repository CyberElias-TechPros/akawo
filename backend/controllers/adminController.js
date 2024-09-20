const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Payment = require('../models/Payment');

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getAllContributions = async (req, res) => {
    try {
        const contributions = await Contribution.find().populate('user', 'name email');
        res.status(200).json({ success: true, count: contributions.length, data: contributions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find().populate('user', 'name email').populate('contribution');
        res.status(200).json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getUserDetails = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        const contributions = await Contribution.find({ user: user._id });
        const payments = await Payment.find({ user: user._id });

        res.status(200).json({
            success: true,
            data: {
                user,
                contributions,
                payments
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(req.params.userId, { isVerified: status }, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
