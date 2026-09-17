import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AuthFrame } from '../components/AuthFrame';
import { Field } from '../components/ui';
import { api, ApiRequestError } from '../api/client';

export default function ResetPassword() {
    const { token } = useParams<{ token?: string }>();
    const [queryToken] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
    const effective = token ?? queryToken;
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            await api.post('/auth/reset-password', { body: { token: effective, password } });
            navigate('/login', { state: { resetDone: true } });
        } catch (err) {
            setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthFrame quote={<>A fresh start. <em>Set a new password you’ll remember.</em></>}>
            <h1>Choose a new password</h1>
            <p className="sub">
                {effective
                    ? 'Enter your new password below. All of your active sessions will be signed out.'
                    : 'This reset link is missing its token. Go back and use the link from your email.'}
            </p>
            {error && <div className="form-error" role="alert">{error}</div>}
            {effective && (
                <form onSubmit={onSubmit} noValidate>
                    <Field id="rp-password" label="New password" hint="At least 8 characters, with a letter and a number.">
                        <input
                            id="rp-password"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </Field>
                    <Field id="rp-confirm" label="Confirm new password">
                        <input
                            id="rp-confirm"
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                        />
                    </Field>
                    <button className="btn btn--block" type="submit" disabled={busy}>
                        {busy ? 'Updating…' : 'Update password'}
                    </button>
                </form>
            )}
            {!effective && (
                <Link to="/forgot-password" className="btn btn--block">
                    Request a new link
                </Link>
            )}
        </AuthFrame>
    );
}
