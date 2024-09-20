import { useCallback } from 'react';
import api from './api';

export const useContributions = () => {
    const makeContribution = useCallback(async (amount) => {
        const response = await api.post('/contributions', { amount });
        return response.data;
    }, []);

    const getUserContributions = useCallback(async () => {
        const response = await api.get('/contributions');
        return response.data;
    }, []);

    const getContributionById = useCallback(async (id) => {
        const response = await api.get(`/contributions/${id}`);
        return response.data;
    }, []);

    return {
        makeContribution,
        getUserContributions,
        getContributionById,
    };
};
