import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, styled } from '@mui/material';
//import { useAuth } from '../hooks/useAuth';  // Ensure correct path
import { AuthProvider } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
}));

const LinkButton = styled(Button)({
    color: 'white',
    textDecoration: 'none',
});

function Navbar() {
    const { currentUser, logout } = useAuth();

    return (
        <AppBar position="static">
            <StyledToolbar>
                <Typography variant="h6" component={RouterLink} to="/" sx={{ color: 'white', textDecoration: 'none' }}>
                    Akawo Platform
                </Typography>
                <div>
                    {currentUser ? (
                        <>
                            <LinkButton component={RouterLink} to="/dashboard">
                                Dashboard
                            </LinkButton>
                            <LinkButton component={RouterLink} to="/contribute">
                                Contribute
                            </LinkButton>
                            <LinkButton onClick={logout}>
                                Logout
                            </LinkButton>
                        </>
                    ) : (
                        <>
                            <LinkButton component={RouterLink} to="/login">
                                Login
                            </LinkButton>
                            <LinkButton component={RouterLink} to="/register">
                                Register
                            </LinkButton>
                        </>
                    )}
                </div>
            </StyledToolbar>
        </AppBar>
    );
}

export default Navbar;
