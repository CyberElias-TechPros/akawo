import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { AdminEmailItem, Pagination } from '../../api/types';
import { EmptyState } from '../../components/ui';
import { timeAgo } from '../../utils/format';

interface EmailsResponse {
    emails: AdminEmailItem[];
    pagination: Pagination;
}

export default function AdminEmails() {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<EmailsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<AdminEmailItem | null>(null);

    const load = useCallback(() => {
        api
            .get<EmailsResponse>(`/admin/emails?page=${page}`)
            .then(setData)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load emails'));
    }, [page]);

    useEffect(() => {
        load();
    }, [load]);

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!data) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div className="card">
            <h3>Email outbox</h3>
            <p className="card__sub">
                {data.pagination.total} emails sent (local outbox — in production these go out via your configured provider)
            </p>

            {data.emails.length === 0 ? (
                <EmptyState title="No emails yet" />
            ) : (
                <div className="rowlist">
                    {data.emails.map((e) => (
                        <button
                            key={e.id}
                            className="rowcard"
                            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                            onClick={() => setOpen(open?.id === e.id ? null : e)}
                        >
                            <div className="rowcard__main">
                                <b>{e.subject}</b>
                                <span>to {e.to}</span>
                            </div>
                            <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{timeAgo(e.createdAt)}</span>
                        </button>
                    ))}
                </div>
            )}

            {open && (
                <div className="card" style={{ marginTop: 16, background: 'var(--paper)', boxShadow: 'none' }}>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink-soft)', margin: 0 }}>
                        {open.body}
                    </pre>
                </div>
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
