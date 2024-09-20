import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

        if (!validateAmount(amount)) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/contributions', { amount: parseFloat(amount) });
            navigate(`/payment/${response.data._id}`);
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="make-contribution">
            <h2>Make a Contribution</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="amount">Amount (NGN):</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        required
                    />
                </div>
                <p>You will contribute: {formatCurrency(amount)}</p>
                <button type="submit">Contribute</button>
            </form>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default MakeContribution;
