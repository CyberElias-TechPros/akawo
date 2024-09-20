import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';

const Navigation = () => {
    const { isAuthenticated, isAdmin, logout } = useAuth();

    return (
        <nav>
            <ul>
                <li><Link to="/">Home</Link></li>
                {!isAuthenticated && (
                    <>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/register">Register</Link></li>
                    </>
                )}
                {isAuthenticated && (
                    <>
                        <li><Link to="/dashboard">Dashboard</Link></li>
                        <li><Link to="/contributions">Contributions</Link></li>
                        <li><Link to="/payments">Payments</Link></li>
                        {isAdmin && <li><Link to="/admin">Admin Panel</Link></li>}
                        <li><button onClick={logout}>Logout</button></li>
                    </>
                )}
            </ul>
        </nav>
    );
};

export default Navigation;
