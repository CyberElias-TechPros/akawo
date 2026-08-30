import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Container, Paper, Alert, Divider } from '@mui/material';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';

const Payment = () => {
    const [contribution, setContribution] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initiating, setInitiating] = useState(false);
    const [error, setError] = useState('');
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchContribution = async () => {
            try {
                const response = await api.get(`/contributions/${id}`);
                setContribution(response.data.data);
            } catch (err) {
                setError('Failed to load contribution details');
            } finally {
                setLoading(false);
            }
        };
        fetchContribution();
    }, [id]);

    const handlePayment = async () => {
        setInitiating(true);
        setError('');
        try {
            const response = await api.post('/payments/initiate', { contributionId: id });
            const { authorizationUrl } = response.data.data;
            if (authorizationUrl) {
                window.location.href = authorizationUrl;
            } else {
                setError('Payment gateway did not return a payment link. Please try again.');
                setInitiating(false);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Payment initiation failed');
            setInitiating(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error && !contribution) {
        return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;
    }

    return (
        <Container maxWidth="xs" sx={{ py: 8 }}>
            <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>Complete Your Contribution</Typography>
                {contribution && (
                    <>
                        <Typography variant="body1">Amount: <strong>{formatCurrency(contribution.amount)}</strong></Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Created: {new Date(contribution.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Status: {contribution.status}</Typography>
                        <Divider sx={{ my: 3 }} />
                        <Button fullWidth variant="contained" onClick={handlePayment} disabled={initiating}>
                            {initiating ? 'Redirecting to payment…' : 'Proceed to Payment'}
                        </Button>
                        <Button fullWidth variant="text" onClick={() => navigate('/dashboard')} sx={{ mt: 1 }}>
                            Back to Dashboard
                        </Button>
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default Payment;
