import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function NotFound() {
    return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <Logo size={44} />
                <h1 style={{ fontSize: 44, margin: '24px 0 10px' }}>Page not found</h1>
                <p style={{ color: 'var(--ink-soft)', marginBottom: 26 }}>
                    The page you’re looking for doesn’t exist — but your savings are safe where they always were.
                </p>
                <Link to="/" className="btn">
                    Back to home
                </Link>
            </div>
        </div>
    );
}
