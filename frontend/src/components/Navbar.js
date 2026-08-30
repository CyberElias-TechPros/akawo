import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
    const { user, isAdmin, logout } = useAuth();

    return (
        <AppBar position="static">
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Typography
                    variant="h6"
                    component={RouterLink}
                    to="/"
                    sx={{ color: 'white', textDecoration: 'none', fontWeight: 700 }}
                >
                    Akawo Platform
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {user ? (
                        <>
                            <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
                            <Button color="inherit" component={RouterLink} to="/contribute">Contribute</Button>
                            <Button color="inherit" component={RouterLink} to="/profile">Profile</Button>
                            {isAdmin && <Button color="inherit" component={RouterLink} to="/admin">Admin</Button>}
                            <Button color="inherit" onClick={logout}>Logout</Button>
                        </>
                    ) : (
                        <>
                            <Button color="inherit" component={RouterLink} to="/login">Login</Button>
                            <Button color="inherit" component={RouterLink} to="/register">Register</Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Navbar;
