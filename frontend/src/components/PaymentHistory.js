import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

const PaymentHistory = ({ payments }) => {
    return (
        <div className="payment-history">
            <h2>Payment History</h2>
            {payments.length === 0 ? (
                <p>No payment history available.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Reference</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((payment) => (
                            <tr key={payment._id}>
                                <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                                <td>{formatCurrency(payment.amount)}</td>
                                <td>{payment.status}</td>
                                <td>{payment.paymentGatewayReference}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default PaymentHistory;
