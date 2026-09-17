import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div className="page-loader" aria-busy="true" />;
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
    if (user.status === 'suspended') return <Navigate to="/login" state={{ suspended: true }} replace />;
    return <>{children}</>;
}
