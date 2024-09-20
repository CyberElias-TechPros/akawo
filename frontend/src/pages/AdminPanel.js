import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../services/admin';

const AdminPanel = () => {
    const { user } = useAuth();
    const { getAllUsers, getAllContributions, verifyUser } = useAdmin();
    const [users, setUsers] = useState([]);
    const [contributions, setContributions] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const fetchedUsers = await getAllUsers();
            const fetchedContributions = await getAllContributions();
            setUsers(fetchedUsers);
            setContributions(fetchedContributions);
        };
        fetchData();
    }, [getAllUsers, getAllContributions]);

    const handleVerifyUser = async (userId) => {
        try {
            await verifyUser(userId);
            setUsers(users.map(user =>
                user.id === userId ? { ...user, isVerified: true } : user
            ));
            alert('User verified successfully');
        } catch (error) {
            alert('Error verifying user: ' + error.message);
        }
    };

    if (!user.isAdmin) {
        return <div>Access Denied. Admin privileges required.</div>;
    }

    return (
        <div className="admin-panel">
            <h1>Admin Panel</h1>
            <section className="users">
                <h2>Users</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>BVN</th>
                            <th>Verified</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.bvn}</td>
                                <td>{user.isVerified ? 'Yes' : 'No'}</td>
                                <td>
                                    {!user.isVerified && (
                                        <button onClick={() => handleVerifyUser(user.id)}>Verify</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <section className="contributions">
                <h2>Contributions</h2>
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contributions.map((contribution) => (
                            <tr key={contribution.id}>
                                <td>{contribution.userName}</td>
                                <td>${contribution.amount}</td>
                                <td>{new Date(contribution.date).toLocaleDateString()}</td>
                                <td>{contribution.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
};

export default AdminPanel;
