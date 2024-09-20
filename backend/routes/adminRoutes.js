const express = require('express');
const {
    getAllUsers,
    getAllContributions,
    getAllPayments,
    getUserDetails,
    updateUserStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.get('/contributions', getAllContributions);
router.get('/payments', getAllPayments);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/status', updateUserStatus);

module.exports = router;
