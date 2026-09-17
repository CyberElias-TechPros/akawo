import type { Env } from '../env';
import { randomId } from '../util/crypto';
import { nowIso } from '../util/format';

export interface OutboxEmail {
    to: string;
    subject: string;
    body: string;
    userId?: string;
}

/**
 * Email service.
 *
 * - channel 'outbox' (default): every email is written to the `emails` table.
 *   This is a real, inspectable outbox — not a no-op — and is what powers the
 *   admin "Outbox" view and dev flows (reset links, verification approvals).
 * - channel 'resend': when RESEND_API_KEY is set, the email is also delivered
 *   via the Resend REST API.
 *
 * Returns the full email (incl. any URLs) so callers can surface dev links.
 */
export async function sendEmail(env: Env, email: OutboxEmail): Promise<OutboxEmail> {
    await env.DB.prepare(
        `INSERT INTO emails (id, to_email, user_id, subject, body, channel, sent_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
        .bind(randomId(), email.to, email.userId ?? null, email.subject, email.body, 'outbox', nowIso())
        .run();

    if (env.MAIL_PROVIDER === 'resend' && env.RESEND_API_KEY) {
        try {
            await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${env.RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: env.MAIL_FROM || 'Akawo <onboarding@resend.dev>',
                    to: [email.to],
                    subject: email.subject,
                    html: `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(email.body)}</pre>`,
                }),
            });
        } catch (err) {
            // Delivery failure must not break the primary flow; the outbox copy
            // is retained and the admin can re-send from the Outbox view.
            console.error(`[mail] resend delivery failed: ${(err as Error).message}`);
        }
    }

    return email;
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
