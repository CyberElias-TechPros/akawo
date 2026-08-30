import React from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { formatCurrency } from '../utils/formatCurrency';

const PaymentHistory = ({ payments }) => {
    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Payment History</Typography>
            {(!payments || payments.length === 0) ? (
                <Typography variant="body2" color="text.secondary">No payment history available.</Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Reference</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={payment.status}
                                            size="small"
                                            color={payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'error' : 'warning'}
                                        />
                                    </TableCell>
                                    <TableCell>{payment.reference || '—'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default PaymentHistory;
