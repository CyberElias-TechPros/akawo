const express = require('express');
const {
    submitVerification,
    checkVerificationStatus,
    approveVerification,
    rejectVerification,
    adminVerifyUser
} = require('../controllers/verificationController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Ensure correct import path

const router = express.Router();

// Protect all routes by default
router.use(protect);

// Route for submitting verification
router.post('/submit', submitVerification);

// Route for checking verification status
router.get('/status/:userId', checkVerificationStatus);

// Admin routes (requires admin authorization)
router.use(authorize('admin'));

router.put('/approve/:id', approveVerification);
router.put('/reject/:id', rejectVerification);
router.post('/admin-verify/:userId', adminVerifyUser);

module.exports = router;
