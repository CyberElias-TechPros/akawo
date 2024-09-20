const Payment = require('../models/Payment');
const Contribution = require('../models/Contribution');
const paymentGatewayService = require('../services/paymentGatewayService');

exports.initiatePayment = async (req, res) => {
    try {
        const { contributionId, amount } = req.body;
        const contribution = await Contribution.findById(contributionId);

        if (!contribution) {
            return res.status(404).json({ success: false, error: 'Contribution not found' });
        }

        if (contribution.user.toString() !== req.user.id) {
            return res.status(401).json({ success: false, error: 'Not authorized to make payment for this contribution' });
        }

        const paymentData = await paymentGatewayService.initiatePayment(amount);

        const payment = await Payment.create({
            user: req.user.id,
            contribution: contributionId,
            amount,
            paymentGatewayReference: paymentData.reference,
            status: 'pending'
        });

        res.status(200).json({ success: true, data: { payment, paymentGatewayData: paymentData } });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        const verificationResult = await paymentGatewayService.verifyPayment(payment.paymentGatewayReference);

        if (verificationResult.status === 'success') {
            payment.status = 'completed';
            await payment.save();

            // Update contribution status
            await Contribution.findByIdAndUpdate(payment.contribution, { status: 'paid' });

            res.status(200).json({ success: true, data: payment });
        } else {
            res.status(400).json({ success: false, error: 'Payment verification failed' });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.uploadPaymentProof = async (req, res) => {
    try {
        const { contributionId } = req.body;
        const file = req.files.proof;

        if (!file) {
            return res.status(400).json({ success: false, error: 'Please upload a file' });
        }

        // Handle file upload (e.g., to cloud storage)
        const uploadResult = await uploadToCloudStorage(file);

        const payment = await Payment.findOneAndUpdate(
            { contribution: contributionId },
            {
                proofOfPayment: uploadResult.url,
                status: 'pending_verification'
            },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json({ success: false, error: 'Payment not found for this contribution' });
        }

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getPayments = async (req, res) => {
    try {
        const payments = await Payment.find({ user: req.user.id }).populate('contribution');
        res.status(200).json({ success: true, count: payments.length, data: payments });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Helper function for file upload (implement according to your cloud storage solution)
async function uploadToCloudStorage(file) {
    // Implement file upload logic here
    // Return an object with the URL of the uploaded file
}
