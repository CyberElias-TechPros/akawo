import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { AdminAuditEntry, Pagination } from '../../api/types';
import { Badge, EmptyState } from '../../components/ui';
import { timeAgo } from '../../utils/format';

interface AuditResponse {
    entries: AdminAuditEntry[];
    pagination: Pagination;
}

const TONE: Record<string, 'ok' | 'warn' | 'bad' | 'neutral'> = {
    'admin.proof_approved': 'ok',
    'admin.verification_approved': 'ok',
    'payment.failed': 'bad',
    'admin.proof_rejected': 'bad',
    'admin.verification_rejected': 'bad',
    'user.suspended': 'bad',
};

export default function AdminAudit() {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<AuditResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        api
            .get<AuditResponse>(`/admin/audit?page=${page}`)
            .then(setData)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load audit log'));
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!data) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div className="card">
            <h3>Audit log</h3>
            <p className="card__sub">Every sensitive action on the platform, newest first.</p>

            {data.entries.length === 0 ? (
                <EmptyState title="No audit entries yet" />
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th>Actor</th>
                            <th>Action</th>
                            <th>Target</th>
                            <th>Detail</th>
                            <th>When</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.entries.map((e) => (
                            <tr key={e.id}>
                                <td style={{ fontSize: 13 }}>{e.actor}</td>
                                <td>
                                    <Badge tone={TONE[e.action] ?? 'neutral'}>{e.action}</Badge>
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                                    {e.entity ? `${e.entity}${e.entityId ? ` · ${e.entityId.slice(0, 8)}…` : ''}` : '—'}
                                </td>
                                <td style={{ fontSize: 12.5, color: 'var(--ink-faint)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {e.meta ? JSON.stringify(e.meta) : ''}
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{timeAgo(e.createdAt)}</td>
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
        </div>
    );
}
