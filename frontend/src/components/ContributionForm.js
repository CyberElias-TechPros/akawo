import React, { useState } from 'react';
import { useContributions } from '../services/contributions';

const ContributionForm = () => {
    const [amount, setAmount] = useState('');
    const { makeContribution } = useContributions();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await makeContribution(parseFloat(amount));
            setAmount('');
            alert('Contribution submitted successfully!');
        } catch (error) {
            alert('Error submitting contribution: ' + error.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Make a Contribution</h2>
            <div>
                <label htmlFor="amount">Amount:</label>
                <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="0"
                    step="0.01"
                />
            </div>
            <button type="submit">Submit Contribution</button>
        </form>
    );
};

export default ContributionForm;
