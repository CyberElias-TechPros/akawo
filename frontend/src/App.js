import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MakeContribution from './pages/MakeContribution';
import Payment from './pages/Payment';
import UserProfile from './pages/UserProfile';
import AdminDashboard from './pages/AdminDashboard';
import VerificationProcess from './pages/VerificationProcess';
import ForgotPassword from './pages/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/BackgroundAnimation.css';

const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
        background: { default: '#f5f5f5' },
    },
    typography: { fontFamily: 'Roboto, Arial, sans-serif' },
    components: {
        MuiButton: { styleOverrides: { root: { borderRadius: 8 } } },
        MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div className="animated-background" />
            <AuthProvider>
                <NotificationProvider>
                    <Navbar />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />

                        <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/contribute" element={<MakeContribution />} />
                            <Route path="/payment/:id" element={<Payment />} />
                            <Route path="/profile" element={<UserProfile />} />
                            <Route path="/verification" element={<VerificationProcess />} />
                        </Route>

                        <Route element={<ProtectedRoute adminOnly />}>
                            <Route path="/admin" element={<AdminDashboard />} />
                        </Route>
                    </Routes>
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
