import React, { useState } from 'react';
import { TextField, Box, Button, Typography } from '@mui/material';

function EmailVerification({ formData, handleFormChange }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    const handleSendCode = () => {
        // TODO: Implement email verification code sending logic
        setCodeSent(true);
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Email Verification
            </Typography>
            <TextField
                fullWidth
                label="Email"
                value={formData.email}
                disabled
                margin="normal"
            />
            <Button
                variant="contained"
                onClick={handleSendCode}
                disabled={codeSent}
                sx={{ mt: 2 }}
            >
                {codeSent ? 'Code Sent' : 'Send Verification Code'}
            </Button>
            {codeSent && (
                <TextField
                    fullWidth
                    label="Verification Code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    margin="normal"
                />
            )}
        </Box>
    );
}

export default EmailVerification;
