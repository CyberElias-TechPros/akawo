import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import ContributionList from '../components/ContributionList';
import PaymentHistory from '../components/PaymentHistory';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';

const Dashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('/users/dashboard');
                setDashboardData(response.data);
            } catch (err) {
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="dashboard">
            <h1>Welcome, {user.name}</h1>
            {dashboardData && (
                <>
                    <div className="dashboard-summary">
                        <div className="summary-card">
                            <h3>Total Contributions</h3>
                            <p>{formatCurrency(dashboardData.totalContributions)}</p>
                        </div>
                        <div className="summary-card">
                            <h3>Current Balance</h3>
                            <p>{formatCurrency(dashboardData.currentBalance)}</p>
                        </div>
                    </div>
                    <Link to="/contribute" className="btn btn-primary">Make a Contribution</Link>
                    <ContributionList contributions={dashboardData.recentContributions} />
                    <PaymentHistory payments={dashboardData.recentPayments} />
                </>
            )}
        </div>
    );
};

export default Dashboard;
