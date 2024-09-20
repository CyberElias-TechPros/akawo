const express = require('express');
const {
    createContribution,
    getContributions,
    getContribution,
    updateContribution,
    deleteContribution
} = require('../controllers/contributionController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
    .post(createContribution)
    .get(getContributions);

router.route('/:id')
    .get(getContribution)
    .put(updateContribution)
    .delete(deleteContribution);

module.exports = router;
