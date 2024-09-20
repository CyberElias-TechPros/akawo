const User = require('../models/User');
const Verification = require('../models/Verification');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { sendVerificationApproval } = require('../services/emailService');
const facialRecognitionService = require('../services/facialRecognitionService');
const livenessVerificationService = require('../services/livenessVerificationService');

// Helper function for file upload (implement according to your cloud storage solution)
const uploadToCloudStorage = async (file) => {
    // Implement file upload logic here
    // Return the URL of the uploaded file
    return 'uploaded-file-url'; // Placeholder
};

// Handle user verification submission
exports.submitVerification = asyncHandler(async (req, res, next) => {
    const { userId } = req.body;
    const facialImage = req.files.facialImage;
    const livenessVideo = req.files.livenessVideo;

    if (!facialImage || !livenessVideo) {
        return res.status(400).json({ success: false, error: 'Please upload both facial image and liveness video' });
    }

    // Upload files to cloud storage
    const facialImageUrl = await uploadToCloudStorage(facialImage);
    const livenessVideoUrl = await uploadToCloudStorage(livenessVideo);

    // Perform facial recognition
    const facialRecognitionResult = await facialRecognitionService.verify(facialImageUrl);

    // Perform liveness verification
    const livenessVerificationResult = await livenessVerificationService.verify(livenessVideoUrl);

    const verification = await Verification.create({
        user: userId,
        facialImage: facialImageUrl,
        livenessVideo: livenessVideoUrl,
        facialRecognitionResult,
        livenessVerificationResult,
        status: 'pending'
    });

    res.status(200).json({ success: true, data: verification });
});

// Check verification status
exports.checkVerificationStatus = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const verification = await Verification.findOne({ user: userId }).sort('-createdAt');

    if (!verification) {
        return res.status(404).json({ success: false, error: 'No verification submission found' });
    }

    res.status(200).json({ success: true, data: verification });
});

// Admin approves or rejects user verification
exports.adminVerifyUser = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const { verificationStatus } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const verification = await Verification.findOne({ user: userId }).sort('-createdAt');
    if (!verification) {
        return res.status(404).json({ success: false, error: 'No verification submission found' });
    }

    verification.status = verificationStatus;
    await verification.save();

    if (verificationStatus === 'approved') {
        user.isVerified = true;
        await user.save();
        await sendVerificationApproval(user);
    }

    res.status(200).json({ success: true, data: { user, verification } });
});
