import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Stack, Card, CardContent, Grid, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const features = [
    { title: 'Secure Contributions', body: 'Your savings are tracked transparently and safely.' },
    { title: 'Easy Management', body: 'Create, track, and manage your contributions in one place.' },
    { title: 'Flexible Plans', body: 'Contribute any amount toward your financial goals.' },
    { title: 'Transparent Process', body: 'Identity verification keeps the community trusted.' },
];

const Home = () => {
    const { user } = useAuth();

    return (
        <Container maxWidth="md" sx={{ py: 6 }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                <Typography variant="h3" component="h1" gutterBottom>
                    Welcome to Akawo Platform
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
                    Secure and easy contributions for your financial goals.
                </Typography>

                {user ? (
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Typography variant="h6">Hello, {user.name}!</Typography>
                        <Button component={Link} to="/dashboard" variant="contained">
                            Go to Dashboard
                        </Button>
                    </Stack>
                ) : (
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button component={Link} to="/login" variant="contained">
                            Login
                        </Button>
                        <Button component={Link} to="/register" variant="outlined">
                            Register
                        </Button>
                    </Stack>
                )}
            </Box>

            <Grid container spacing={3}>
                {features.map((f) => (
                    <Grid item xs={12} sm={6} key={f.title}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {f.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {f.body}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default Home;
