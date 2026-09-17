import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthFrame } from '../components/AuthFrame';
import { Field } from '../components/ui';
import { api, ApiRequestError } from '../api/client';
import { sameOriginUrl } from '../utils/links';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState<string | null>(null);
    const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const data = await api.post<{ message: string; devResetUrl?: string }>('/auth/forgot-password', {
                body: { email },
            });
            setSent(data.message);
            setDevResetUrl(data.devResetUrl ? sameOriginUrl(data.devResetUrl) : null);
        } catch (err) {
            setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthFrame quote={<>Locked out? <em>Your password can be rebuilt in a minute.</em></>}>
            <Link to="/login">← Back to sign in</Link>
            <h1>Reset your password</h1>
            <p className="sub">Enter your account email and we’ll send you a secure reset link.</p>
            {error && <div className="form-error" role="alert">{error}</div>}
            {sent ? (
                <div>
                    <div className="form-ok" role="status">{sent}.</div>
                    {devResetUrl && (
                        <div className="form-error" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', borderColor: 'rgba(154,107,15,.3)' }}>
                            Dev environment — your reset link: <br />
                            <a href={devResetUrl} rel="noreferrer" style={{ wordBreak: 'break-all' }}>
                                {devResetUrl}
                            </a>
                        </div>
                    )}
                    <p className="auth__foot">Check your inbox (and spam). Links expire after 1 hour.</p>
                </div>
            ) : (
                <form onSubmit={onSubmit} noValidate>
                    <Field id="fp-email" label="Email address">
                        <input
                            id="fp-email"
                            className="input"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </Field>
                    <button className="btn btn--block" type="submit" disabled={busy}>
                        {busy ? 'Sending…' : 'Send reset link'}
                    </button>
                </form>
            )}
        </AuthFrame>
    );
}
