import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Button, Card, CardContent, Grid, Container, Alert, Stack } from '@mui/material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ContributionList from '../components/ContributionList';
import PaymentHistory from '../components/PaymentHistory';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';

const Dashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/users/dashboard');
                setDashboardData(response.data.data);
            } catch (err) {
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>Welcome, {user.name}</Typography>

            {!user.isVerified && (
                <Alert severity="info" sx={{ mb: 3 }} action={
                    <Button component={Link} to="/verification" color="inherit" size="small">Verify now</Button>
                }>
                    Your account is not verified yet. Verify your identity to unlock full features.
                </Alert>
            )}

            {dashboardData && (
                <>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary">Total Contributions</Typography>
                                    <Typography variant="h5">{formatCurrency(dashboardData.totalContributions)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="subtitle2" color="text.secondary">Current Balance</Typography>
                                    <Typography variant="h5">{formatCurrency(dashboardData.currentBalance)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                        <Button component={Link} to="/contribute" variant="contained">Make a Contribution</Button>
                    </Stack>

                    <ContributionList contributions={dashboardData.recentContributions || []} />
                    <PaymentHistory payments={dashboardData.recentPayments || []} />
                </>
            )}
        </Container>
    );
};

export default Dashboard;
