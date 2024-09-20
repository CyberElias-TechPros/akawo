import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import Home from './Home';

test('renders Home page with welcome message', () => {
    render(
        <AuthProvider>
            <Router>
                <Home />
            </Router>
        </AuthProvider>
    );

    expect(screen.getByText(/Welcome to Akawo Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Secure and easy contributions for your financial goals./i)).toBeInTheDocument();
});

// Add more tests for different states (logged in, not logged in)
