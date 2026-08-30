import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Container, Paper, Alert, Divider } from '@mui/material';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const VerificationProcess = () => {
    const [facialImage, setFacialImage] = useState(null);
    const [livenessVideo, setLivenessVideo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);
    const [currentStatus, setCurrentStatus] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await api.get('/verification/status');
                setCurrentStatus(response.data.data);
            } catch (err) {
                // 404 = no submission yet, which is fine
                setCurrentStatus(null);
            } finally {
                setStatusLoading(false);
            }
        };
        checkStatus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!facialImage || !livenessVideo) {
            setError('Please provide both a facial image and a liveness video');
            return;
        }

        const formData = new FormData();
        formData.append('facialImage', facialImage);
        formData.append('livenessVideo', livenessVideo);

        setLoading(true);
        try {
            const response = await api.post('/verification/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCurrentStatus(response.data.data);
            setSuccess('Verification submitted successfully. Please wait for admin approval.');
            setFacialImage(null);
            setLivenessVideo(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification submission failed');
        } finally {
            setLoading(false);
        }
    };

    if (statusLoading) return <LoadingSpinner />;

    const statusLabel = currentStatus ? currentStatus.status : 'not_submitted';

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom>Account Verification</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Upload a clear photo of your face and a short video of yourself (liveness check).
                    An administrator will review your submission.
                </Typography>

                {statusLabel !== 'not_submitted' && (
                    <Alert
                        severity={statusLabel === 'approved' ? 'success' : statusLabel === 'rejected' ? 'error' : 'info'}
                        sx={{ mb: 3 }}
                    >
                        Current status: <strong>{statusLabel}</strong>
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Facial Image</Typography>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFacialImage(e.target.files[0])}
                            required
                        />
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Liveness Video</Typography>
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => setLivenessVideo(e.target.files[0])}
                            required
                        />
                    </Box>

                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

                    <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 3 }}>
                        {loading ? 'Submitting…' : 'Submit Verification'}
                    </Button>
                    <Button variant="text" fullWidth onClick={() => navigate('/dashboard')} sx={{ mt: 1 }}>
                        Back to Dashboard
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default VerificationProcess;
