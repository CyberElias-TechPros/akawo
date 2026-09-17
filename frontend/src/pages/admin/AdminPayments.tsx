import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { AdminPaymentItem, Pagination } from '../../api/types';
import { Badge, EmptyState, toast } from '../../components/ui';
import { formatDate, formatNgn, timeAgo } from '../../utils/format';

interface PaymentsResponse {
    payments: AdminPaymentItem[];
    pagination: Pagination;
}

export default function AdminPayments() {
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<PaymentsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reviewing, setReviewing] = useState<AdminPaymentItem | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const load = useCallback(() => {
        const params = new URLSearchParams({ page: String(page) });
        if (status) params.set('status', status);
        api
            .get<PaymentsResponse>(`/admin/payments?${params.toString()}`)
            .then(setData)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load payments'));
    }, [page, status]);

    useEffect(() => {
        load();
    }, [load]);

    const reviewProof = async (approve: boolean) => {
        if (!reviewing) return;
        if (!approve && !note.trim()) {
            setActionError('A reason is required — the user will see it.');
            return;
        }
        setBusy(true);
        setActionError(null);
        try {
            if (approve) {
                await api.post(`/admin/payments/${reviewing.id}/proof/approve`, { body: { note: note.trim() || undefined } });
                toast('ok', 'Proof approved — contribution marked paid');
            } else {
                await api.post(`/admin/payments/${reviewing.id}/proof/reject`, { body: { reason: note.trim() } });
                toast('ok', 'Proof rejected — user can resubmit or pay by card');
            }
            setReviewing(null);
            load();
        } catch (err) {
            setActionError(err instanceof ApiRequestError ? err.message : 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!data) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div className="card">
            <h3>Payments</h3>
            <p className="card__sub">{data.pagination.total} total</p>

            <div className="searchbox">
                <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="pending_verification">Proof in review</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                </select>
            </div>

            {data.payments.length === 0 ? (
                <EmptyState title="No payments found" />
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Gateway</th>
                            <th>When</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.payments.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    <b>{p.user?.name ?? 'Unknown'}</b>
                                    <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{p.label ?? ''}</div>
                                </td>
                                <td className="num">{formatNgn(p.amount)}</td>
                                <td>
                                    <Badge tone={p.status === 'completed' ? 'ok' : p.status === 'failed' ? 'bad' : 'warn'}>
                                        {p.status === 'pending_verification' ? 'Proof in review' : p.status}
                                    </Badge>
                                </td>
                                <td style={{ fontSize: 13 }}>{p.gateway}</td>
                                <td style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{timeAgo(p.createdAt)}</td>
                                <td>
                                    {p.status === 'pending_verification' && (
                                        <button
                                            className="btn btn--sm btn--ghost"
                                            onClick={() => {
                                                setReviewing(p);
                                                setNote('');
                                                setActionError(null);
                                            }}
                                        >
                                            Review proof
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {data.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <button className="btn btn--sm btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Newer</button>
                    <span style={{ alignSelf: 'center', fontSize: 13.5, color: 'var(--ink-faint)' }}>
                        Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <button className="btn btn--sm btn--ghost" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Older →</button>
                </div>
            )}

            {reviewing && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Payment proof review"
                    style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,25,21,0.5)', display: 'grid', placeItems: 'center', padding: 20 }}
                    onClick={(e) => e.target === e.currentTarget && setReviewing(null)}
                >
                    <div className="card" style={{ width: 'min(100%, 480px)' }}>
                        <button className="iconbtn" style={{ position: 'absolute', top: 14, right: 14 }} onClick={() => setReviewing(null)} aria-label="Close">
                            ✕
                        </button>
                        <h3>Review proof of payment</h3>
                        <p className="card__sub">
                            {formatNgn(reviewing.amount)} · {reviewing.user?.name ?? ''} · {formatDate(reviewing.createdAt)}
                        </p>
                        {actionError && <div className="form-error">{actionError}</div>}
                        <label className="field__label" htmlFor="proof-note">Note (sent to the user on rejection; optional on approval)</label>
                        <textarea
                            id="proof-note"
                            className="textarea"
                            rows={2}
                            placeholder="e.g. Amount on screenshot matches the transfer reference"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ marginBottom: 14 }}
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn" onClick={() => reviewProof(true)} disabled={busy}>
                                Approve &amp; mark paid
                            </button>
                            <button className="btn btn--danger" onClick={() => reviewProof(false)} disabled={busy}>
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
