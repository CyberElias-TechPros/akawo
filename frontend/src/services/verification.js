import { useCallback } from 'react';
import api from './api';

export const useVerification = () => {
    const submitVerification = useCallback(async (userId, facialImage, livenessVideo) => {
        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('facialImage', facialImage);
        formData.append('livenessVideo', livenessVideo);

        const response = await api.post('/verification/submit', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }, []);

    const checkVerificationStatus = useCallback(async (userId) => {
        const response = await api.get(`/verification/status/${userId}`);
        return response.data;
    }, []);

    return {
        submitVerification,
        checkVerificationStatus,
    };
};
