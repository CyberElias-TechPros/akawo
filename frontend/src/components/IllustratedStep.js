import React from 'react';
import { Box, Typography } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import FaceIcon from '@mui/icons-material/Face';

const icons = {
    'Basic Info': AccountCircleIcon,
    'BVN Verification': VerifiedUserIcon,
    'Email Verification': EmailIcon,
    'Phone Verification': PhoneIcon,
    'Face Validation': FaceIcon,
};

function IllustratedStep({ step, children }) {
    const Icon = icons[step];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Icon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
                {step}
            </Typography>
            {children}
        </Box>
    );
}

export default IllustratedStep;
