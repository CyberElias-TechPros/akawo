import { Link } from 'react-router-dom';

export function Logo({ dark = false, size = 34 }: { dark?: boolean; size?: number }) {
    return (
        <Link to="/" className={`logo ${dark ? 'logo--dark' : ''}`} aria-label="Akawo home">
            <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
                <rect width="64" height="64" rx="14" fill={dark ? '#C9A227' : '#0A3D2D'} />
                <path d="M32 14 L48 46 H40.5 L32 29 L23.5 46 H16 Z" fill={dark ? '#0A3D2D' : '#C9A227'} />
                <circle cx="32" cy="49" r="3.4" fill={dark ? '#0A3D2D' : '#F6F3EC'} />
            </svg>
            <span className="logo__word">akawo</span>
        </Link>
    );
}
