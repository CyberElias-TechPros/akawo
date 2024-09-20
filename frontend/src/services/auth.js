import { useState, useEffect, useContext, createContext } from 'react';
import api from './api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        setUser(response.data);
        return response.data;
    };

    const register = async (name, email, password, bvn) => {
        const response = await api.post('/auth/register', { name, email, password, bvn });
        setUser(response.data);
        return response.data;
    };

    const logout = async () => {
        await api.post('/auth/logout');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
