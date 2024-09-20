import React, { useState } from 'react';
import { TextField, Box, Button, Typography } from '@mui/material';

function PhoneVerification({ formData, handleFormChange }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    const handleSendCode = () => {
        // TODO: Implement phone verification code sending logic
        setCodeSent(true);
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Phone Verification
            </Typography>
            <TextField
                fullWidth
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
                margin="normal"
            />
            <Button
                variant="contained"
                onClick={handleSendCode}
                disabled={codeSent || !formData.phoneNumber}
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

export default PhoneVerification;
