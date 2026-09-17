import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from '../auth/RequireAuth';
import { AppShell } from '../components/AppShell';
import Dashboard from '../pages/app/Dashboard';
import { mockApi, withAuth, render, screen, waitFor, MOCK_USER } from './helpers';

const DASHBOARD_DATA = {
    user: MOCK_USER,
    summary: { totalContributed: 120000, pendingAmount: 30000, paidCount: 4, pendingCount: 1, monthlyTotal: 10000 },
    nextContribution: { id: 'c-1', amount: 30000, dueDate: '2026-09-24', label: 'School fees', overdue: false },
    recentContributions: [
        {
            id: 'c-1',
            amount: 30000,
            label: 'School fees',
            frequency: 'once',
            status: 'pending',
            dueDate: '2026-09-24',
            paidAt: null,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
            overdue: false,
        },
    ],
    recentPayments: [
        {
            id: 'p-1',
            amount: 90000,
            status: 'completed',
            gateway: 'mock',
            proofStatus: null,
            createdAt: '2026-09-02T00:00:00Z',
            completedAt: '2026-09-02T00:00:00Z',
            label: 'Term fees',
        },
    ],
    unreadNotifications: 2,
    proofsAwaitingReview: 0,
    verification: { isVerified: true, emailVerified: true },
};

describe('Dashboard (authenticated)', () => {
    it('loads the dashboard and renders summary, next contribution and payments', async () => {
        mockApi({
            '/auth/me': () =>
                new Response(JSON.stringify({ success: true, data: { user: MOCK_USER } }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
            '/users/dashboard': () =>
                new Response(JSON.stringify({ success: true, data: DASHBOARD_DATA }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }),
        });

        render(
            withAuth(
                <Routes>
                    <Route
                        path="/dashboard"
                        element={
                            <RequireAuth>
                                <AppShell />
                            </RequireAuth>
                        }
                    >
                        <Route index element={<Dashboard />} />
                    </Route>
                </Routes>,
                '/dashboard',
            ),
        );

        await waitFor(() => expect(screen.getByText(/Chinedu/)).toBeInTheDocument(), { timeout: 4000 });
        expect(screen.getByText('₦120,000.00', { selector: '.statcard__value' })).toBeInTheDocument();
        expect(screen.getByText('₦30,000.00', { selector: '.statcard__value' })).toBeInTheDocument();
        expect(screen.getByText('₦10,000.00', { selector: '.statcard__value' })).toBeInTheDocument();
        expect(screen.getAllByText(/School fees/).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('link', { name: /Pay now/i })).toBeInTheDocument();
        expect(screen.getByText(/2 unread/)).toBeInTheDocument();
    });

    it('redirects unauthenticated visitors to /login', async () => {
        mockApi({
            '/auth/me': () =>
                new Response(JSON.stringify({ success: false, error: { code: 'unauthorized' } }), { status: 401 }),
        });

        render(
            withAuth(
                <Routes>
                    <Route
                        path="/dashboard"
                        element={
                            <RequireAuth>
                                <AppShell />
                            </RequireAuth>
                        }
                    >
                        <Route index element={<Dashboard />} />
                    </Route>
                    <Route path="/login" element={<div>RENDERED_LOGIN</div>} />
                </Routes>,
                '/dashboard',
            ),
        );

        await waitFor(() => expect(screen.getByText('RENDERED_LOGIN')).toBeInTheDocument(), { timeout: 4000 });
    });
});
