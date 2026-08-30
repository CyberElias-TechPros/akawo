import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';

jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: null, isAdmin: false }),
}));

test('renders Home page with welcome message', () => {
    render(
        <MemoryRouter>
            <Home />
        </MemoryRouter>
    );

    expect(screen.getByText(/Welcome to Akawo Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Secure and easy contributions for your financial goals./i)).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
});
