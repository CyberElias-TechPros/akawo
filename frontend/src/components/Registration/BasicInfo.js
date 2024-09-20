import React from 'react';
import { TextField, Box } from '@mui/material';
import { customStyles } from '../../styles/customStyles'; // Adjust the path as needed

function BasicInfo({ formData, handleFormChange }) {
    return (
        <Box>
            <TextField
                fullWidth
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => handleFormChange('fullName', e.target.value)}
                margin="normal"
                sx={customStyles.textField} // Apply custom styles here
            />
            <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                margin="normal"
                sx={customStyles.textField} // Apply custom styles here
            />
            <TextField
                fullWidth
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                margin="normal"
                sx={customStyles.textField} // Apply custom styles here
            />
        </Box>
    );
}

export default BasicInfo;
