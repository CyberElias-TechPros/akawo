const express = require('express');
const {
    initiatePayment,
    verifyPayment,
    uploadPaymentProof,
    getPayments
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/initiate', initiatePayment);
router.post('/verify/:paymentId', verifyPayment);
router.post('/upload-proof', uploadPaymentProof);
router.get('/', getPayments);

module.exports = router;
