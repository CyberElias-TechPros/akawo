import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Typography, Button, Container, Paper, Alert, Chip, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const UserProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/users/profile');
                setProfile(response.data.data);
            } catch (err) {
                setError('Error fetching profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error) return <Container sx={{ py: 4 }}><Alert severity="error">{error}</Alert></Container>;

    const data = profile || user;

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>User Profile</Typography>
                <List>
                    <ListItem><ListItemText primary="Name" secondary={data.name} /></ListItem>
                    <Divider />
                    <ListItem><ListItemText primary="Email" secondary={data.email} /></ListItem>
                    <Divider />
                    {data.phone && <><ListItem><ListItemText primary="Phone" secondary={data.phone} /></ListItem><Divider /></>}
                    <ListItem><ListItemText primary="BVN" secondary={data.bvn ? `•••• ${data.bvn.slice(-4)}` : '—'} /></ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemText
                            primary="Verification Status"
                            secondary={data.isVerified ? 'Your account is verified.' : 'Your account is not verified yet.'}
                        />
                        <Chip
                            label={data.isVerified ? 'Verified' : 'Not Verified'}
                            color={data.isVerified ? 'success' : 'warning'}
                            size="small"
                        />
                    </ListItem>
                </List>
                {!data.isVerified && (
                    <Button component={Link} to="/verification" variant="contained" fullWidth sx={{ mt: 2 }}>
                        Verify Account
                    </Button>
                )}
            </Paper>
        </Container>
    );
};

export default UserProfile;
