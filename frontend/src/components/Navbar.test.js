import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import Navbar from './Navbar';

test('renders Navbar with login and register links when not logged in', () => {
    render(
        <AuthProvider>
            <Router>
                <Navbar />
            </Router>
        </AuthProvider>
    );

    expect(screen.getByText(/Akawo Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
});

// You would need to mock the useAuth hook to test the logged-in state
// This is just a basic example and more tests should be added
