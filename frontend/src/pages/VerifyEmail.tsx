import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthFrame } from '../components/AuthFrame';
import { api, ApiRequestError } from '../api/client';

type State = 'checking' | 'done' | 'error';

export default function VerifyEmail() {
    const [state, setState] = useState<State>('checking');
    const [message, setMessage] = useState('');
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        const token = new URLSearchParams(window.location.search).get('token');
        if (!token) {
            setState('error');
            setMessage('This verification link is missing its token.');
            return;
        }
        api
            .post('/auth/verify-email', { body: { token } })
            .then(() => setState('done'))
            .catch((err) => {
                setState('error');
                setMessage(err instanceof ApiRequestError ? err.message : 'Verification failed.');
            });
    }, []);

    return (
        <AuthFrame quote={<>One small step. <em>Confirm this is really you.</em></>}>
            <h1>Verify your email</h1>
            <div className="page-loader" style={{ minHeight: 120 }}>
                {state === 'checking' && <span className="spinner" />}
                {state === 'done' && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="form-ok" role="status" style={{ maxWidth: 320, margin: '0 auto 18px' }}>
                            Your email is verified. Welcome to Akawo.
                        </div>
                        <Link to="/dashboard" className="btn">
                            Go to your dashboard
                        </Link>
                    </div>
                )}
                {state === 'error' && (
                    <div style={{ textAlign: 'center' }}>
                        <div className="form-error" role="alert" style={{ maxWidth: 320, margin: '0 auto 18px' }}>
                            {message}
                        </div>
                        <Link to="/login" className="btn btn--ghost">
                            Back to sign in
                        </Link>
                    </div>
                )}
            </div>
        </AuthFrame>
    );
}
