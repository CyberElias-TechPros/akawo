import React from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { formatCurrency } from '../utils/formatCurrency';

const ContributionList = ({ contributions }) => {
    return (
        <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Your Contributions</Typography>
            {(!contributions || contributions.length === 0) ? (
                <Typography variant="body2" color="text.secondary">You haven't made any contributions yet.</Typography>
            ) : (
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {contributions.map((contribution) => (
                                <TableRow key={contribution.id}>
                                    <TableCell>{new Date(contribution.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>{formatCurrency(contribution.amount)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={contribution.status}
                                            size="small"
                                            color={contribution.status === 'paid' ? 'success' : contribution.status === 'failed' ? 'error' : 'warning'}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default ContributionList;
