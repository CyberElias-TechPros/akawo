import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Paper, Alert } from '@mui/material';
import api from '../services/api';
import { validateAmount } from '../utils/validateInput';
import { formatCurrency } from '../utils/formatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';

const MakeContribution = () => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const value = parseFloat(amount);
        if (!validateAmount(value)) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/contributions', { amount: value });
            const contribution = response.data.data;
            navigate(`/payment/${contribution.id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container maxWidth="xs" sx={{ py: 8 }}>
            <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>Make a Contribution</Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField
                        fullWidth
                        label="Amount (NGN)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputProps={{ min: 0, step: '0.01' }}
                        margin="normal"
                        required
                    />
                    {amount && !isNaN(parseFloat(amount)) && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            You will contribute: <strong>{formatCurrency(parseFloat(amount))}</strong>
                        </Typography>
                    )}
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
                        Contribute
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default MakeContribution;
