import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { NotificationItem } from '../../api/types';
import { EmptyState, toast } from '../../components/ui';
import { timeAgo } from '../../utils/format';

const TYPE_LABEL: Record<string, string> = {
    payment_completed: 'Payment',
    proof_rejected: 'Proof',
    proof_approved: 'Proof',
    kyc_approved: 'Identity',
    kyc_rejected: 'Identity',
    email_verified: 'Account',
    password_changed: 'Account',
    contribution_reminder: 'Reminder',
};

export default function Notifications() {
    const [items, setItems] = useState<NotificationItem[] | null>(null);
    const [unread, setUnread] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        Promise.all([
            api.get<{ notifications: NotificationItem[] }>('/notifications'),
            api.get<{ count: number }>('/notifications/unread-count'),
        ])
            .then(([n, c]) => {
                setItems(n.notifications);
                setUnread(c.count);
            })
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load notifications'));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const markRead = async (id: string) => {
        try {
            await api.post(`/notifications/${id}/read`);
            setItems((cur) => cur?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) ?? null);
            setUnread((u) => Math.max(0, u - 1));
        } catch {
            /* non-critical */
        }
    };

    const readAll = async () => {
        try {
            await api.post('/notifications/read-all');
            load();
            toast('ok', 'All caught up');
        } catch (err) {
            toast('bad', err instanceof ApiRequestError ? err.message : 'Failed to mark all as read');
        }
    };

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!items) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div>
            <div className="page-head">
                <span className="eyebrow">Inbox</span>
                <h1>Notifications</h1>
                <p>
                    {unread > 0 ? `${unread} unread` : 'You’re all caught up.'}
                </p>
                {unread > 0 && (
                    <button className="btn btn--sm btn--ghost" style={{ marginTop: 12 }} onClick={readAll}>
                        Mark all as read
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <EmptyState title="No notifications yet" body="Payment confirmations, proof reviews and account events will appear here." />
            ) : (
                <div className="rowlist">
                    {items.map((n) => (
                        <button
                            key={n.id}
                            className="rowcard"
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                cursor: 'pointer',
                                border: '1px solid var(--line-soft)',
                                background: n.readAt ? 'var(--surface)' : 'linear-gradient(135deg, #fffdf6, #fbf7ea)',
                            }}
                            onClick={() => !n.readAt && markRead(n.id)}
                        >
                            <div className="rowcard__main">
                                <b style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {TYPE_LABEL[n.type] ?? 'Update'}
                                    {!n.readAt && <span className="badge badge--gold" style={{ fontSize: 10.5 }}>new</span>}
                                </b>
                                <span>{n.title}</span>
                            </div>
                            <div style={{ maxWidth: 280, fontSize: 13.5, color: 'var(--ink-soft)' }}>{n.body}</div>
                            <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{timeAgo(n.createdAt)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
