const axios = require('axios');

const PAYMENT_GATEWAY_API = process.env.PAYMENT_GATEWAY_API;
const PAYMENT_GATEWAY_SECRET_KEY = process.env.PAYMENT_GATEWAY_SECRET_KEY;

exports.initiatePayment = async (amount) => {
    try {
        const response = await axios.post(`${PAYMENT_GATEWAY_API}/transaction/initialize`, {
            amount: amount * 100, // Convert to lowest currency unit
            currency: 'NGN',
        }, {
            headers: {
                Authorization: `Bearer ${PAYMENT_GATEWAY_SECRET_KEY}`,
            },
        });

        return response.data.data;
    } catch (error) {
        throw new Error('Failed to initiate payment: ' + error.message);
    }
};

exports.verifyPayment = async (reference) => {
    try {
        const response = await axios.get(`${PAYMENT_GATEWAY_API}/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYMENT_GATEWAY_SECRET_KEY}`,
            },
        });

        return response.data.data;
    } catch (error) {
        throw new Error('Failed to verify payment: ' + error.message);
    }
};
