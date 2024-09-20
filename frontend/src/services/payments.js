import { useCallback } from 'react';
import api from './api';

export const usePayments = () => {
    const initiatePayment = useCallback(async (contributionId, amount) => {
        const response = await api.post('/payments/initiate', { contributionId, amount });
        return response.data;
    }, []);

    const verifyPayment = useCallback(async (paymentId) => {
        const response = await api.post(`/payments/verify/${paymentId}`);
        return response.data;
    }, []);

    const uploadPaymentProof = useCallback(async (contributionId, file) => {
        const formData = new FormData();
        formData.append('proof', file);
        formData.append('contributionId', contributionId);

        const response = await api.post('/payments/upload-proof', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }, []);

    return {
        initiatePayment,
        verifyPayment,
        uploadPaymentProof,
    };
};
