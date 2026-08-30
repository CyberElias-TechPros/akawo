import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Card, CardContent, Grid, Tabs, Tab, Box, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper, Button, Chip, Alert,
} from '@mui/material';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';

const StatCard = ({ title, value }) => (
    <Card>
        <CardContent>
            <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
            <Typography variant="h5">{value}</Typography>
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const [tab, setTab] = useState(0);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [contributions, setContributions] = useState([]);
    const [payments, setPayments] = useState([]);
    const [verifications, setVerifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [statsRes, usersRes, contribRes, paymentsRes, verifRes] = await Promise.all([
                api.get('/admin/stats'),
                api.get('/admin/users'),
                api.get('/admin/contributions'),
                api.get('/admin/payments'),
                api.get('/admin/verifications'),
            ]);
            setStats(statsRes.data.data);
            setUsers(usersRes.data.data);
            setContributions(contribRes.data.data);
            setPayments(paymentsRes.data.data);
            setVerifications(verifRes.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const handleToggleVerify = async (userId, current) => {
        setNotice('');
        try {
            await api.put(`/admin/users/${userId}/status`, { isVerified: !current });
            setUsers(users.map((u) => (u.id === userId ? { ...u, isVerified: !current } : u)));
            setNotice(`User ${current ? 'unverified' : 'verified'} successfully.`);
        } catch (err) {
            setNotice(err.response?.data?.error || 'Failed to update user status');
        }
    };

    const handleResolveVerification = async (verificationId, status) => {
        setNotice('');
        try {
            await api.put(`/admin/verifications/${verificationId}`, { status });
            await fetchAll();
            setNotice(`Verification ${status}.`);
        } catch (err) {
            setNotice(err.response?.data?.error || 'Failed to update verification');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {notice && <Alert severity="info" sx={{ mb: 2 }}>{notice}</Alert>}

            {stats && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={6} sm={3}><StatCard title="Total Users" value={stats.totalUsers} /></Grid>
                    <Grid item xs={6} sm={3}><StatCard title="Total Contributions" value={stats.totalContributions} /></Grid>
                    <Grid item xs={6} sm={3}><StatCard title="Amount Contributed" value={formatCurrency(stats.totalAmountContributed)} /></Grid>
                    <Grid item xs={6} sm={3}><StatCard title="Pending Verifications" value={stats.pendingVerifications} /></Grid>
                </Grid>
            )}

            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="Users" />
                <Tab label="Contributions" />
                <Tab label="Payments" />
                <Tab label="Verifications" />
            </Tabs>

            {tab === 0 && (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>BVN</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Verified</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.name}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.bvn}</TableCell>
                                    <TableCell>{u.role}</TableCell>
                                    <TableCell>
                                        <Chip label={u.isVerified ? 'Yes' : 'No'} color={u.isVerified ? 'success' : 'warning'} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="small" variant="outlined" onClick={() => handleToggleVerify(u.id, u.isVerified)}>
                                            {u.isVerified ? 'Unverify' : 'Verify'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 1 && (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {contributions.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.userName} <Typography variant="caption" color="text.secondary">({c.userEmail})</Typography></TableCell>
                                    <TableCell>{formatCurrency(c.amount)}</TableCell>
                                    <TableCell>{c.status}</TableCell>
                                    <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 2 && (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Reference</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Proof</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {payments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.userName}</TableCell>
                                    <TableCell>{formatCurrency(p.amount)}</TableCell>
                                    <TableCell>{p.reference || '—'}</TableCell>
                                    <TableCell>{p.status}</TableCell>
                                    <TableCell>
                                        {p.proofUrl ? (
                                            <Button size="small" href={p.proofUrl} target="_blank" rel="noreferrer">View</Button>
                                        ) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 3 && (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>User</TableCell>
                                <TableCell>Facial Image</TableCell>
                                <TableCell>Liveness Video</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {verifications.map((v) => (
                                <TableRow key={v.id}>
                                    <TableCell>{v.userName}</TableCell>
                                    <TableCell>
                                        {v.facialImage ? <Button size="small" href={v.facialImage} target="_blank" rel="noreferrer">View</Button> : '—'}
                                    </TableCell>
                                    <TableCell>
                                        {v.livenessVideo ? <Button size="small" href={v.livenessVideo} target="_blank" rel="noreferrer">View</Button> : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={v.status} color={v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'error' : 'warning'} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        {v.status === 'pending' && (
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button size="small" variant="contained" color="success" onClick={() => handleResolveVerification(v.id, 'approved')}>Approve</Button>
                                                <Button size="small" variant="outlined" color="error" onClick={() => handleResolveVerification(v.id, 'rejected')}>Reject</Button>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
};

export default AdminDashboard;
