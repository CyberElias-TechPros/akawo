import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthFrame } from '../components/AuthFrame';
import { Field } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiRequestError } from '../api/client';
import { setAccessToken, storeTokens } from '../api/client';
import { sameOriginUrl } from '../utils/links';
import type { TokenPair, User } from '../api/types';

export default function Register() {
    const { refreshUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', bvn: '' });
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            const data = await api.post<{ user: User; tokens: TokenPair; emailVerification?: { devUrl?: string } }>(
                '/auth/register',
                {
                    body: {
                        name: form.name,
                        email: form.email,
                        password: form.password,
                        bvn: form.bvn.replace(/\s+/g, ''),
                    },
                },
            );
            setAccessToken(data.tokens.accessToken);
            storeTokens(data.tokens);
            await refreshUser();
            const devUrl = data.emailVerification?.devUrl ? sameOriginUrl(data.emailVerification.devUrl) : null;
            // Dev-only shortcut: jump straight to the verification link.
            // In production EXPOSE_RESET_LINKS is false and devUrl is never sent.
            if (devUrl) {
                window.location.replace(devUrl);
                return;
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthFrame quote={<>One account. <em>Every contribution you owe, finally in order.</em></>}>
            <Link to="/">← Back to home</Link>
            <h1>Create your account</h1>
            <p className="sub">It takes about a minute. You’ll need your Bank Verification Number (BVN).</p>
            {error && <div className="form-error" role="alert">{error}</div>}
            <form onSubmit={onSubmit} noValidate>
                <Field id="name" label="Full name">
                    <input id="name" className="input" autoComplete="name" value={form.name} onChange={set('name')} required />
                </Field>
                <Field id="reg-email" label="Email address">
                    <input id="reg-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
                </Field>
                <Field id="reg-bvn" label="BVN" hint="The 11-digit Bank Verification Number from your bank.">
                    <input
                        id="reg-bvn"
                        className="input"
                        inputMode="numeric"
                        pattern="[0-9]{11}"
                        placeholder="e.g. 2219 0000 000"
                        value={form.bvn}
                        onChange={(e) => setForm((f) => ({ ...f, bvn: e.target.value.replace(/[^\d\s]/g, '').slice(0, 15) }))}
                        required
                    />
                </Field>
                <Field id="reg-password" label="Password" hint="At least 10 characters, with a mix of upper, lower, numbers and symbols.">
                    <input
                        id="reg-password"
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={set('password')}
                        required
                    />
                </Field>
                <button className="btn btn--block" type="submit" disabled={busy}>
                    {busy ? 'Creating your account…' : 'Create account'}
                </button>
            </form>
            <p className="auth__foot">
                Already have an account? <Link to="/login">Sign in</Link>
            </p>
        </AuthFrame>
    );
}
