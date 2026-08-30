import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Container, Paper, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validatePassword, validateBVN } from '../utils/validateInput';

const Register = () => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', bvn: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const validate = () => {
        if (!form.name.trim()) return 'Please enter your full name';
        if (!validateEmail(form.email)) return 'Please enter a valid email address';
        if (!validatePassword(form.password)) {
            return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase and 1 number';
        }
        if (!validateBVN(form.bvn)) return 'BVN must be exactly 11 digits';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }
        setSubmitting(true);
        try {
            const user = await register({
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                password: form.password,
                bvn: form.bvn.trim(),
            });
            navigate(user.isVerified ? '/dashboard' : '/verification');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ py: 8 }}>
            <Paper elevation={2} sx={{ p: 4 }}>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Create your account
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <TextField fullWidth label="Full Name" name="name" value={form.name} onChange={handleChange} margin="normal" required />
                    <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} margin="normal" required />
                    <TextField fullWidth label="Phone Number" name="phone" value={form.phone} onChange={handleChange} margin="normal" placeholder="e.g. 08012345678" />
                    <TextField fullWidth label="Password" name="password" type="password" value={form.password} onChange={handleChange} margin="normal" required helperText="At least 8 characters with upper & lower case and a number" />
                    <TextField fullWidth label="BVN (Bank Verification Number)" name="bvn" value={form.bvn} onChange={handleChange} margin="normal" required inputProps={{ maxLength: 11 }} />
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button type="submit" fullWidth variant="contained" disabled={submitting} sx={{ mt: 3 }}>
                        {submitting ? 'Creating account…' : 'Register'}
                    </Button>
                    <Typography variant="body2" align="center" sx={{ mt: 2 }}>
                        Already have an account? <Link to="/login">Login</Link>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default Register;
