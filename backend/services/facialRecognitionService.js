const axios = require('axios');

const FACIAL_RECOGNITION_API = process.env.FACIAL_RECOGNITION_API;
const FACIAL_RECOGNITION_API_KEY = process.env.FACIAL_RECOGNITION_API_KEY;

exports.verify = async (imageUrl) => {
    try {
        const response = await axios.post(`${FACIAL_RECOGNITION_API}/verify`, {
            image_url: imageUrl,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': FACIAL_RECOGNITION_API_KEY,
            },
        });

        return response.data;
    } catch (error) {
        throw new Error('Facial recognition verification failed: ' + error.message);
    }
};
