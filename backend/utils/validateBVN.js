const axios = require('axios');

const BVN_VALIDATION_API = process.env.BVN_VALIDATION_API;
const BVN_VALIDATION_API_KEY = process.env.BVN_VALIDATION_API_KEY;

const validateBVN = async (bvn) => {
    try {
        const response = await axios.post(`${BVN_VALIDATION_API}/verify`, {
            bvn: bvn
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BVN_VALIDATION_API_KEY}`
            }
        });

        return response.data.valid;
    } catch (error) {
        console.error('BVN validation error:', error);
        return false;
    }
};

module.exports = validateBVN;
