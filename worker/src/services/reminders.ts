import type { Env } from '../env';
import { all, first } from '../db';
import { formatNgn } from '../util/format';
import { notify } from './notify';
import { sendEmail } from './mail';

export interface ReminderResult {
    dueToday: number;
    overdue: number;
}

/**
 * Daily due-date reminders.
 *
 * For every pending contribution with a due date:
 *   - due today      → 'contribution_due_today'
 *   - due before now → 'contribution_overdue'
 *
 * At most one reminder per day per (user, type) — deduped against
 * notifications created in the last 24h, so a nightly cron never spams.
 * In production an email goes out alongside the in-app notification
 * (the outbox table always records it).
 */
export async function runDueReminders(env: Env): Promise<ReminderResult> {
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(Date.now() - 86400000).toISOString();

    const rows = await all<{
        user_id: string;
        amount_kobo: number;
        label: string | null;
        due_date: string | null;
    }>(
        env.DB,
        `SELECT user_id, amount_kobo, label, due_date
         FROM contributions
         WHERE status = 'pending' AND due_date IS NOT NULL`,
    );

    let dueToday = 0;
    let overdue = 0;

    for (const r of rows) {
        if (!r.due_date) continue;
        const isOverdue = r.due_date < today;
        if (!isOverdue && r.due_date !== today) continue;

        const already = (await first<{ n: number }>(
            env.DB,
            `SELECT COUNT(*) AS n FROM notifications
             WHERE user_id = ? AND type = ? AND created_at >= ?`,
            r.user_id,
            isOverdue ? 'contribution_overdue' : 'contribution_due_today',
            dayStart,
        )) as { n: number } | null;
        if (already?.n) continue;

        const amount = formatNgn(r.amount_kobo);
        const title = isOverdue ? 'Contribution overdue' : 'Contribution due today';
        const body = isOverdue
            ? `${r.label ?? 'Your contribution'} of ${amount} was due ${r.due_date}. Please pay it now to get back on track.`
            : `${r.label ?? 'Your contribution'} of ${amount} is due today (${r.due_date}).`;

        await notify(env, r.user_id, isOverdue ? 'contribution_overdue' : 'contribution_due_today', title, body);

        const user = (await first<{ name: string; email: string }>(
            env.DB,
            `SELECT name, email FROM users WHERE id = ?`,
            r.user_id,
        )) as { name: string; email: string } | null;
        if (user) {
            await sendEmail(env, {
                to: user.email,
                userId: r.user_id,
                subject: `${title} — Akawo`,
                body: `Hi ${user.name},\n\n${body}\n\nYou can pay it from the app in a couple of taps.\n\n— The Akawo Team`,
            });
        }

        if (isOverdue) overdue++;
        else dueToday++;
    }

    return { dueToday, overdue };
}
