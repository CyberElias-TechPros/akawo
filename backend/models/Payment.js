const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    contribution: {
        type: mongoose.Schema.ObjectId,
        ref: 'Contribution',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentGatewayReference: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'pending_verification'],
        default: 'pending'
    },
    proofOfPayment: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Payment', PaymentSchema);
