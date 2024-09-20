const Contribution = require('../models/Contribution');

exports.createContribution = async (req, res) => {
    try {
        req.body.user = req.user.id;
        const contribution = await Contribution.create(req.body);
        res.status(201).json({ success: true, data: contribution });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getContributions = async (req, res) => {
    try {
        const contributions = await Contribution.find({ user: req.user.id });
        res.status(200).json({ success: true, count: contributions.length, data: contributions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getContribution = async (req, res) => {
    try {
        const contribution = await Contribution.findById(req.params.id);
        if (!contribution) {
            return res.status(404).json({ success: false, error: 'Contribution not found' });
        }
        if (contribution.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to access this contribution' });
        }
        res.status(200).json({ success: true, data: contribution });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.updateContribution = async (req, res) => {
    try {
        let contribution = await Contribution.findById(req.params.id);
        if (!contribution) {
            return res.status(404).json({ success: false, error: 'Contribution not found' });
        }
        if (contribution.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to update this contribution' });
        }
        contribution = await Contribution.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        res.status(200).json({ success: true, data: contribution });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.deleteContribution = async (req, res) => {
    try {
        const contribution = await Contribution.findById(req.params.id);
        if (!contribution) {
            return res.status(404).json({ success: false, error: 'Contribution not found' });
        }
        if (contribution.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to delete this contribution' });
        }
        await contribution.remove();
        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
