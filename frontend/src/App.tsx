import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './components/AppShell';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import NotFound from './pages/NotFound';

const Dashboard = lazy(() => import('./pages/app/Dashboard'));
const Contributions = lazy(() => import('./pages/app/Contributions'));
const ContributionPay = lazy(() => import('./pages/app/ContributionPay'));
const Verification = lazy(() => import('./pages/app/Verification'));
const Profile = lazy(() => import('./pages/app/Profile'));
const Notifications = lazy(() => import('./pages/app/Notifications'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminVerifications = lazy(() => import('./pages/admin/AdminVerifications'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminEmails = lazy(() => import('./pages/admin/AdminEmails'));
const AdminAudit = lazy(() => import('./pages/admin/AdminAudit'));

const fallback = (
    <div className="page-loader" aria-busy="true">
        <span className="spinner" />
    </div>
);

export default function App() {
    return (
        <Suspense fallback={fallback}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />

                <Route
                    path="/dashboard"
                    element={
                        <RequireAuth>
                            <AppShell />
                        </RequireAuth>
                    }
                >
                    <Route index element={<Dashboard />} />
                    <Route path="contributions" element={<Contributions />} />
                    <Route path="contribute/:id" element={<ContributionPay />} />
                    <Route path="verification" element={<Verification />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="notifications" element={<Notifications />} />
                </Route>

                <Route
                    path="/admin"
                    element={
                        <RequireAuth admin>
                            <AdminLayout />
                        </RequireAuth>
                    }
                >
                    <Route index element={<AdminOverview />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="verifications" element={<AdminVerifications />} />
                    <Route path="payments" element={<AdminPayments />} />
                    <Route path="emails" element={<AdminEmails />} />
                    <Route path="audit" element={<AdminAudit />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
}
