import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

const ContributionList = ({ contributions }) => {
    return (
        <div className="contribution-list">
            <h2>Your Contributions</h2>
            {contributions.length === 0 ? (
                <p>You haven't made any contributions yet.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contributions.map((contribution) => (
                            <tr key={contribution._id}>
                                <td>{new Date(contribution.createdAt).toLocaleDateString()}</td>
                                <td>{formatCurrency(contribution.amount)}</td>
                                <td>{contribution.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ContributionList;
