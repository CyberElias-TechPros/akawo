const axios = require('axios');

const LIVENESS_VERIFICATION_API = process.env.LIVENESS_VERIFICATION_API;
const LIVENESS_VERIFICATION_API_KEY = process.env.LIVENESS_VERIFICATION_API_KEY;

exports.verify = async (videoUrl) => {
    try {
        const response = await axios.post(`${LIVENESS_VERIFICATION_API}/verify`, {
            video_url: videoUrl,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': LIVENESS_VERIFICATION_API_KEY,
            },
        });

        return response.data;
    } catch (error) {
        throw new Error('Liveness verification failed: ' + error.message);
    }
};
