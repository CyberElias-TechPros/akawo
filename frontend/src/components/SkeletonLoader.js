import React from 'react';
import { Skeleton, Box } from '@mui/material';

function SkeletonLoader() {
    return (
        <Box sx={{ width: '100%', maxWidth: 600, margin: 'auto', p: 3 }}>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="80%" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={40} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="30%" height={40} sx={{ ml: 'auto' }} />
        </Box>
    );
}

export default SkeletonLoader;
