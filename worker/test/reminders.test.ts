import { describe, it, expect } from 'vitest';
import { api, registerUser } from './helpers';

describe('due reminders (cron)', () => {
    it('notifies due-today and overdue contributions, once per day', async () => {
        const u = await registerUser();
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

        for (const [amount, dueDate, label] of [
            [1000, today, 'Due today'],
            [2000, yesterday, 'Overdue one'],
            [3000, future, 'Future one'],
        ] as const) {
            const c = await api('POST', '/api/contributions', {
                token: u.tokens.accessToken,
                body: { amount, dueDate, label },
            });
            expect(c.status).toBe(201);
        }

        const run1 = await api('POST', '/api/test/run-cron');
        expect(run1.status).toBe(200);
        expect(run1.body.data).toEqual({ dueToday: 1, overdue: 1 });

        const list = await api('GET', '/api/notifications?limit=20', { token: u.tokens.accessToken });
        const types = (list.body.data.notifications as Array<{ type: string }>).map((n) => n.type);
        expect(types).toContain('contribution_due_today');
        expect(types).toContain('contribution_overdue');
        expect(types.filter((t) => t.startsWith('contribution_')).length).toBe(2);

        // Same-day re-run must not duplicate
        const run2 = await api('POST', '/api/test/run-cron');
        expect(run2.body.data).toEqual({ dueToday: 0, overdue: 0 });
    });
});
