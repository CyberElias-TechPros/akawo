import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const UserProfile = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/users/profile');
                setProfile(response.data);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="user-profile">
            <h1>User Profile</h1>
            {profile ? (
                <div>
                    <p><strong>Name:</strong> {profile.name}</p>
                    <p><strong>Email:</strong> {profile.email}</p>
                    <p><strong>BVN:</strong> {profile.bvn}</p>
                    <p><strong>Verification Status:</strong> {profile.isVerified ? 'Verified' : 'Not Verified'}</p>
                    {!profile.isVerified && (
                        <button onClick={() => {/* Implement verification process */ }}>
                            Verify Account
                        </button>
                    )}
                </div>
            ) : (
                <p>Unable to load profile information.</p>
            )}
        </div>
    );
};

export default UserProfile;
