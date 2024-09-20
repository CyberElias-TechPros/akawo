import React, { useState, useEffect } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminStats = async () => {
            try {
                const response = await api.get('/admin/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminStats();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="admin-dashboard">
            <h1>Admin Dashboard</h1>
            {stats ? (
                <div>
                    <div className="stat-card">
                        <h3>Total Users</h3>
                        <p>{stats.totalUsers}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Contributions</h3>
                        <p>{stats.totalContributions}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Amount Contributed</h3>
                        <p>{stats.totalAmountContributed}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Pending Verifications</h3>
                        <p>{stats.pendingVerifications}</p>
                    </div>
                </div>
            ) : (
                <p>Unable to load admin statistics.</p>
            )}
        </div>
    );
};

export default AdminDashboard;
