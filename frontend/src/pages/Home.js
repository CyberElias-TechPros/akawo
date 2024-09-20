import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
    const { user } = useAuth();

    return (
        <div className="home">
            <h1>Welcome to Akawo Platform</h1>
            <p>Secure and easy contributions for your financial goals.</p>

            {user ? (
                <div>
                    <p>Hello, {user.name}!</p>
                    <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                </div>
            ) : (
                <div>
                    <Link to="/login" className="btn btn-primary">Login</Link>
                    <Link to="/register" className="btn btn-secondary">Register</Link>
                </div>
            )}

            <section className="features">
                <h2>Why Choose Akawo?</h2>
                <ul>
                    <li>Secure Contributions</li>
                    <li>Easy Management</li>
                    <li>Flexible Plans</li>
                    <li>Transparent Process</li>
                </ul>
            </section>
        </div>
    );
};

export default Home;
