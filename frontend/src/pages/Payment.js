import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';

const Payment = () => {
    const [contribution, setContribution] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchContribution = async () => {
            try {
                const response = await api.get(`/contributions/${id}`);
                setContribution(response.data);
            } catch (err) {
                setError('Failed to load contribution details');
            } finally {
                setLoading(false);
            }
        };

        fetchContribution();
    }, [id]);

    const handlePayment = async () => {
        setLoading(true);
        try {
            const response = await api.post(`/payments/initiate`, { contributionId: id });
            // Redirect to payment gateway
            window.location.href = response.data.paymentUrl;
        } catch (err) {
            setError(err.response?.data?.error || 'Payment initiation failed');
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="payment">
            <h2>Complete Your Contribution</h2>
            {contribution && (
                <div>
                    <p>Amount: {formatCurrency(contribution.amount)}</p>
                    <p>Date: {new Date(contribution.createdAt).toLocaleDateString()}</p>
                    <button onClick={handlePayment}>Proceed to Payment</button>
                </div>
            )}
        </div>
    );
};

export default Payment;
