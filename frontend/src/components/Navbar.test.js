import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

jest.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: null, isAdmin: false, logout: jest.fn() }),
}));

test('renders Navbar with login and register links when not logged in', () => {
    render(
        <MemoryRouter>
            <Navbar />
        </MemoryRouter>
    );

    expect(screen.getByText(/Akawo Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
});
