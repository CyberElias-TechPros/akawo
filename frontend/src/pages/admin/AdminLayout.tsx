import { NavLink, Outlet } from 'react-router-dom';

const ITEMS = [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/verifications', label: 'KYC queue' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/emails', label: 'Email outbox' },
    { to: '/admin/audit', label: 'Audit log' },
];

export default function AdminLayout() {
    return (
        <div>
            <div className="page-head" style={{ marginTop: 22 }}>
                <span className="eyebrow">Admin console</span>
                <h1>Platform overview</h1>
            </div>
            <nav className="admin-nav" aria-label="Admin sections">
                {ITEMS.map((i) => (
                    <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                        {i.label}
                    </NavLink>
                ))}
            </nav>
            <Outlet />
        </div>
    );
}
