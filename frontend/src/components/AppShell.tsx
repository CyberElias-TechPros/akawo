import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../auth/AuthProvider';
import { Logo } from './Logo';

const NAV = [
    { to: '/dashboard', label: 'Dashboard', end: true },
    { to: '/dashboard/contributions', label: 'Contributions' },
    { to: '/dashboard/history', label: 'History' },
    { to: '/dashboard/verification', label: 'Verification' },
    { to: '/dashboard/notifications', label: 'Notifications' },
];

export function AppShell() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const reduced = useReducedMotion() ?? false;
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const locationKey = useLocation().pathname;

    useEffect(() => {
        setOpen(false);
    }, [locationKey]);

    const onLogout = async () => {
        setSigningOut(true);
        await logout();
        navigate('/login');
    };

    return (
        <div className="shell">
            <header className="topbar">
                <div className="container topbar__inner">
                    <Logo size={30} />
                    <nav className={`topnav ${open ? 'is-open' : ''}`} aria-label="Primary">
                        {NAV.map((n) => (
                            <NavLink
                                key={n.to}
                                to={n.to}
                                end={n.end}
                                className={({ isActive }) => `topnav__link ${isActive ? 'is-active' : ''}`}
                            >
                                {n.label}
                            </NavLink>
                        ))}
                        {user?.role === 'admin' && (
                            <NavLink to="/admin" className={({ isActive }) => `topnav__link topnav__link--admin ${isActive ? 'is-active' : ''}`}>
                                Admin
                            </NavLink>
                        )}
                    </nav>
                    <div className="topbar__right">
                        <Link to="/dashboard/profile" className="avatar" aria-label="Profile">
                            <span>{(user?.name ?? '?').slice(0, 1).toUpperCase()}</span>
                        </Link>
                        <button
                            className="iconbtn topbar__burger"
                            aria-expanded={open}
                            aria-label="Toggle menu"
                            onClick={() => setOpen((v) => !v)}
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </div>
            </header>

            <main className="shell__main container">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={locationKey}
                        initial={reduced ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? undefined : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <footer className="site-footer">
                <div className="container site-footer__inner">
                    <span>© {new Date().getFullYear()} Akawo. Saving together, the Nigerian way.</span>
                    <button className="linkish" onClick={onLogout} disabled={signingOut}>
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            </footer>
        </div>
    );
}
