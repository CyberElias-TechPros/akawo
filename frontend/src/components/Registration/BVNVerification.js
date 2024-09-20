import React from 'react';
import { TextField, Box, Typography } from '@mui/material';

function BVNVerification({ formData, handleFormChange }) {
    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                BVN Verification
            </Typography>
            <TextField
                fullWidth
                label="BVN"
                value={formData.bvn}
                onChange={(e) => handleFormChange('bvn', e.target.value)}
                margin="normal"
            />
            <Typography variant="body2" color="textSecondary">
                We'll use your BVN to verify your identity and ensure you're of legal age.
            </Typography>
        </Box>
    );
}

export default BVNVerification;
