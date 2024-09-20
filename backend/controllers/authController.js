const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { name, email, password, bvn } = req.body;
        const user = await User.create({ name, email, password, bvn });
        const token = user.getSignedJwtToken();
        res.status(201).json({ success: true, token });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.logout = (req, res) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, data: {} });
};

exports.getMe = async (req, res) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            return res.status(401).json({ success: false, error: 'Refresh token not found' });
        }
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }
        sendTokenResponse(user, 200, res);
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = user.getSignedJwtToken();
    const refreshToken = user.getSignedRefreshToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    };

    res
        .status(statusCode)
        .cookie('token', token, options)
        .cookie('refreshToken', refreshToken, { ...options, expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
        .json({ success: true, token });
};
