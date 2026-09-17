import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { AdminVerificationDetail, AdminVerificationQueueItem, Pagination } from '../../api/types';
import { Badge, EmptyState, toast } from '../../components/ui';
import { formatDate } from '../../utils/format';

interface QueueResponse {
    verifications: AdminVerificationQueueItem[];
    pagination: Pagination;
}

export default function AdminVerifications() {
    const [filter, setFilter] = useState('pending');
    const [page, setPage] = useState(1);
    const [queue, setQueue] = useState<QueueResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<AdminVerificationDetail | null>(null);
    const [busy, setBusy] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [actionError, setActionError] = useState<string | null>(null);

    const load = useCallback(() => {
        api
            .get<QueueResponse>(`/admin/verifications?status=${filter}&page=${page}`)
            .then(setQueue)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load verifications'));
    }, [filter, page]);

    useEffect(() => {
        load();
    }, [load]);

    const openDetail = async (id: string) => {
        setActionError(null);
        setRejectReason('');
        setDetail(null);
        try {
            const d = await api.get<AdminVerificationDetail>(`/admin/verifications/${id}`);
            setDetail(d);
        } catch (err) {
            toast('bad', err instanceof ApiRequestError ? err.message : 'Failed to open verification');
        }
    };

    const review = async (approve: boolean) => {
        if (!detail) return;
        if (!approve && !rejectReason.trim()) {
            setActionError('A rejection reason is required — the user will see it.');
            return;
        }
        setBusy(true);
        setActionError(null);
        try {
            if (approve) {
                await api.post(`/admin/verifications/${detail.verification.id}/approve`);
                toast('ok', 'Verification approved — user is now fully trusted');
            } else {
                await api.post(`/admin/verifications/${detail.verification.id}/reject`, { body: { reason: rejectReason.trim() } });
                toast('ok', 'Verification rejected — user can resubmit');
            }
            setDetail(null);
            load();
        } catch (err) {
            setActionError(err instanceof ApiRequestError ? err.message : 'Action failed');
        } finally {
            setBusy(false);
        }
    };

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!queue) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div>
            <div className="searchbox">
                <select className="select" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="">All</option>
                </select>
            </div>

            {queue.verifications.length === 0 ? (
                <EmptyState title="Nothing here" body={`No ${filter === '' ? '' : filter + ' '}verifications found.`} />
            ) : (
                <div className="rowlist">
                    {queue.verifications.map((v) => (
                        <div className="rowcard" key={v.id}>
                            <div className="rowcard__main">
                                <b>{v.user.name}</b>
                                <span>
                                    {v.user.email} · {v.user.bvnLast4} · submitted {formatDate(v.createdAt)}
                                </span>
                            </div>
                            <Badge tone={v.status === 'approved' ? 'ok' : v.status === 'rejected' ? 'bad' : 'warn'}>{v.status}</Badge>
                            <button className="btn btn--sm btn--ghost" onClick={() => openDetail(v.id)}>
                                Review
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {queue.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <button className="btn btn--sm btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Newer</button>
                    <span style={{ alignSelf: 'center', fontSize: 13.5, color: 'var(--ink-faint)' }}>
                        Page {queue.pagination.page} of {queue.pagination.totalPages}
                    </span>
                    <button className="btn btn--sm btn--ghost" disabled={page >= queue.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Older →</button>
                </div>
            )}

            {detail && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Verification review"
                    style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,25,21,0.5)', display: 'grid', placeItems: 'center', padding: 20 }}
                    onClick={(e) => e.target === e.currentTarget && setDetail(null)}
                >
                    <div className="card" style={{ width: 'min(100%, 640px)', maxHeight: '86vh', overflow: 'auto', position: 'relative' }}>
                        <button className="iconbtn" style={{ position: 'absolute', top: 14, right: 14 }} onClick={() => setDetail(null)} aria-label="Close">
                            ✕
                        </button>
                        <h3>{detail.user.name}</h3>
                        <p className="card__sub">
                            {detail.user.email} · {detail.user.bvnLast4}
                            {detail.user.phone ? ` · ${detail.user.phone}` : ''} · submitted {formatDate(detail.verification.createdAt)}
                        </p>
                        {detail.verification.status !== 'pending' && (
                            <div style={{ marginBottom: 12 }}>
                                <Badge tone={detail.verification.status === 'approved' ? 'ok' : 'bad'}>
                                    Reviewed: {detail.verification.status}
                                </Badge>
                            </div>
                        )}
                        {detail.verification.rejectReason && (
                            <div className="form-error" style={{ marginTop: 10 }}>
                                Reason: {detail.verification.rejectReason}
                            </div>
                        )}

                        <div className="media-grid">
                            <figure className="media-cell" style={{ margin: 0 }}>
                                <img src={detail.media.face} alt="Facial photo submission" />
                                <figcaption>Facial photo</figcaption>
                            </figure>
                            <figure className="media-cell" style={{ margin: 0 }}>
                                <video src={detail.media.liveness} controls preload="metadata" />
                                <figcaption>Liveness video</figcaption>
                            </figure>
                        </div>

                        {detail.verification.status === 'pending' && (
                            <div style={{ marginTop: 18 }}>
                                {actionError && <div className="form-error">{actionError}</div>}
                                <label className="field__label" htmlFor="rej-reason">Rejection reason (required to reject)</label>
                                <textarea
                                    id="rej-reason"
                                    className="textarea"
                                    rows={2}
                                    placeholder="e.g. Photo is too blurry — please retake in better light"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    style={{ marginBottom: 14 }}
                                />
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn" onClick={() => review(true)} disabled={busy}>
                                        Approve
                                    </button>
                                    <button className="btn btn--danger" onClick={() => review(false)} disabled={busy}>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
