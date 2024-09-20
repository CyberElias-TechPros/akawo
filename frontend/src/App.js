import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import RegistrationForm from './components/Registration/RegistrationForm';
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
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
        background: {
            default: '#f5f5f5',
        },
    },
    typography: {
        fontFamily: 'Roboto, Arial, sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                },
            },
        },
    },
});

const pageVariants = {
    initial: { opacity: 0, y: 50 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -50 },
};

const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
};

const MotionRoute = ({ children }) => (
    <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
    >
        {children}
    </motion.div>
);

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <div className="animated-background" />
            <AuthProvider>
                <NotificationProvider>
                    <Router>
                        <Navbar />
                        <Routes>
                            <Route path="/" element={<MotionRoute><Home /></MotionRoute>} />
                            <Route path="/login" element={<MotionRoute><Login /></MotionRoute>} />
                            <Route path="/register" element={<MotionRoute><RegistrationForm /></MotionRoute>} />
                            <Route path="/forgot-password" element={<MotionRoute><ForgotPassword /></MotionRoute>} />
                            <Route element={<ProtectedRoute />}>
                                <Route path="/dashboard" element={<MotionRoute><Dashboard /></MotionRoute>} />
                                <Route path="/contribute" element={<MotionRoute><MakeContribution /></MotionRoute>} />
                                <Route path="/payment/:id" element={<MotionRoute><Payment /></MotionRoute>} />
                                <Route path="/profile" element={<MotionRoute><UserProfile /></MotionRoute>} />
                                <Route path="/verification" element={<MotionRoute><VerificationProcess /></MotionRoute>} />
                            </Route>
                            <Route element={<ProtectedRoute adminOnly />}>
                                <Route path="/admin" element={<MotionRoute><AdminDashboard /></MotionRoute>} />
                            </Route>
                        </Routes>
                    </Router>
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
