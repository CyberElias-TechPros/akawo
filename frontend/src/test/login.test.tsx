import { describe, it, expect, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import { mockApi, withAuth, render, screen, fireEvent, waitFor, MOCK_USER, MOCK_TOKENS } from './helpers';

describe('Login flow', () => {
    it('signs in with valid credentials and navigates to the dashboard', async () => {
        const loginSpy = vi.fn();
        mockApi({
            '/auth/me': () =>
                new Response(JSON.stringify({ success: false, error: { code: 'unauthorized' } }), { status: 401 }),
            '/auth/login': () => {
                loginSpy();
                return new Response(
                    JSON.stringify({ success: true, data: { user: MOCK_USER, tokens: MOCK_TOKENS } }),
                    { status: 200, headers: { 'Content-Type': 'application/json' } },
                );
            },
        });

        render(
            withAuth(
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<div>RENDERED_DASHBOARD</div>} />
                </Routes>,
                '/login',
            ),
        );

        fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'chinedu@akawo.dev' } });
        fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'Akawo#Demo1' } });
        fireEvent.submit(screen.getByRole('button', { name: /Sign in/i }).closest('form')!);

        await waitFor(() => expect(screen.getByText('RENDERED_DASHBOARD')).toBeInTheDocument());
        expect(loginSpy).toHaveBeenCalled();
        expect(window.localStorage.getItem('akawo.refreshToken')).toBe(MOCK_TOKENS.refreshToken);
    });

    it('shows the API error on failed login', async () => {
        mockApi({
            '/auth/me': () =>
                new Response(JSON.stringify({ success: false, error: { code: 'unauthorized' } }), { status: 401 }),
            '/auth/login': () =>
                new Response(
                    JSON.stringify({ success: false, error: { code: 'invalid_credentials', message: 'Incorrect email or password' } }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } },
                ),
        });

        render(
            withAuth(
                <Routes>
                    <Route path="/login" element={<Login />} />
                </Routes>,
                '/login',
            ),
        );

        fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'nobody@akawo.dev' } });
        fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'wrong-pass-1' } });
        fireEvent.submit(screen.getByRole('button', { name: /Sign in/i }).closest('form')!);

        await waitFor(() => expect(screen.getByText(/Incorrect email or password/i)).toBeInTheDocument());
    });
});
