import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { Payment, Pagination } from '../../api/types';
import { Badge, EmptyState } from '../../components/ui';
import { formatDate, formatNgn } from '../../utils/format';

interface PaymentsResponse {
    payments: Payment[];
    pagination: Pagination;
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending',
    pending_verification: 'Proof in review',
    completed: 'Completed',
    failed: 'Failed',
};

export default function History() {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<PaymentsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        api
            .get<PaymentsResponse>(`/payments?page=${page}`)
            .then(setData)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load payment history'));
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!data) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div>
            <div className="page-head">
                <span className="eyebrow">History</span>
                <h1>Payment history</h1>
                <p>Every payment attempt on your contributions, newest first.</p>
            </div>

            {data.payments.length === 0 ? (
                <EmptyState title="No payments yet" body="When you pay a contribution — by card or transfer proof — it will appear here." />
            ) : (
                <div className="card" style={{ padding: '8px 18px' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Contribution</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Gateway</th>
                                <th>When</th>
                                <th>Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.payments.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <b>{p.label ?? 'Contribution'}</b>
                                        {p.proofStatus && (
                                            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                                                proof: {p.proofStatus}
                                                {p.proofNote ? ` — ${p.proofNote}` : ''}
                                            </div>
                                        )}
                                        {p.failureReason && (
                                            <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{p.failureReason}</div>
                                        )}
                                    </td>
                                    <td className="num">{formatNgn(p.amount)}</td>
                                    <td>
                                        <Badge tone={p.status === 'completed' ? 'ok' : p.status === 'failed' ? 'bad' : 'warn'}>
                                            {STATUS_LABEL[p.status] ?? p.status}
                                        </Badge>
                                    </td>
                                    <td style={{ fontSize: 13 }}>{p.gateway}</td>
                                    <td style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{formatDate(p.createdAt)}</td>
                                    <td style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{p.gatewayReference ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {data.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                    <button className="btn btn--sm btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        ← Newer
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: 13.5, color: 'var(--ink-faint)' }}>
                        Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <button
                        className="btn btn--sm btn--ghost"
                        disabled={page >= data.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Older →
                    </button>
                </div>
            )}
        </div>
    );
}
