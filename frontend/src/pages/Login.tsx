import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthFrame } from '../components/AuthFrame';
import { Field } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { ApiRequestError } from '../api/client';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
    const suspended = (location.state as { suspended?: boolean } | null)?.suspended;

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthFrame quote={<>Sign in. <em>Pick up right where your savings left off.</em></>}>
            <Link to="/">← Back to home</Link>
            <h1>Welcome back</h1>
            <p className="sub">Enter your details to continue to your dashboard.</p>
            {suspended && <div className="form-error">Your account has been suspended. Contact support for assistance.</div>}
            {error && <div className="form-error" role="alert">{error}</div>}
            <form onSubmit={onSubmit} noValidate>
                <Field id="email" label="Email address">
                    <input
                        id="email"
                        className="input"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </Field>
                <Field id="password" label="Password">
                    <input
                        id="password"
                        className="input"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </Field>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 20px' }}>
                    <Link to="/forgot-password" className="linkish" style={{ fontSize: 13.5 }}>
                        Forgot password?
                    </Link>
                </div>
                <button className="btn btn--block" type="submit" disabled={busy}>
                    {busy ? 'Signing in…' : 'Sign in'}
                </button>
            </form>
            <p className="auth__foot">
                New to Akawo? <Link to="/register">Create an account</Link>
            </p>
        </AuthFrame>
    );
}
