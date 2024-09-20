import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // Import axios for making API requests

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
    return useContext(AuthContext);
}

// AuthProvider component to provide auth context to children
export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user information when the component mounts
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    // Function to fetch the current user from the API
    const fetchUser = async () => {
        try {
            const response = await axios.get('/api/users/me');
            setCurrentUser(response.data);
        } catch (error) {
            console.error('Error fetching user:', error);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Function to log in a user
    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Function to register a new user
    const register = async (name, email, password, bvn) => {
        try {
            const response = await axios.post('/api/auth/register', { name, email, password, bvn });
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setCurrentUser(user);
            return user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    // Function to log out the user
    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setCurrentUser(null);
        }
    };

    // Context value that will be available to children components
    const value = {
        currentUser,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
