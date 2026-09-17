import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { api, ApiRequestError } from '../../api/client';
import type { AdminUser, Pagination } from '../../api/types';
import { Badge, toast } from '../../components/ui';
import { formatDate, formatNgn } from '../../utils/format';

interface UsersResponse {
    users: AdminUser[];
    pagination: Pagination;
}

export default function AdminUsers() {
    const { user: me } = useAuth();
    const [q, setQ] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [verified, setVerified] = useState('');
    const [data, setData] = useState<UsersResponse | null>(null);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [detail, setDetail] = useState<{
        user: AdminUser;
        contributions: Array<{ id: string; amount: number; status: string; label: string | null; createdAt: string }>;
        payments: Array<{ id: string; amount: number; status: string; proofStatus: string | null; createdAt: string }>;
        verifications: Array<{ id: string; status: string; createdAt: string; reviewedAt: string | null }>;
    } | null>(null);

    const load = useCallback(() => {
        const params = new URLSearchParams({ page: String(page) });
        if (q.trim()) params.set('q', q.trim());
        if (role) params.set('role', role);
        if (status) params.set('status', status);
        if (verified) params.set('verified', verified);
        api
            .get<UsersResponse>(`/admin/users?${params.toString()}`)
            .then(setData)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load users'));
    }, [page, q, role, status, verified]);

    useEffect(() => {
        load();
    }, [load]);

    const act = async (id: string, action: 'suspend' | 'activate' | 'promote' | 'demote', confirmMsg: string) => {
        if (!window.confirm(confirmMsg)) return;
        setBusyId(id);
        try {
            if (action === 'suspend' || action === 'activate') {
                await api.put(`/admin/users/${id}/status`, { body: { status: action === 'suspend' ? 'suspended' : 'active' } });
            } else {
                await api.put(`/admin/users/${id}/role`, { body: { role: action === 'promote' ? 'admin' : 'user' } });
            }
            toast('ok', `User ${action === 'activate' ? 'activated' : action === 'promote' ? 'promoted' : action === 'demote' ? 'demoted' : 'suspended'}`);
            load();
        } catch (err) {
            toast('bad', err instanceof ApiRequestError ? err.message : 'Action failed');
        } finally {
            setBusyId(null);
        }
    };

    const openDetail = async (id: string) => {
        setDetail(null);
        try {
            const d = await api.get<{
                user: AdminUser;
                contributions: Array<{ id: string; amount: number; status: string; label: string | null; createdAt: string }>;
                payments: Array<{ id: string; amount: number; status: string; proofStatus: string | null; createdAt: string }>;
                verifications: Array<{ id: string; status: string; createdAt: string; reviewedAt: string | null }>;
            }>(`/admin/users/${id}`);
            setDetail(d);
        } catch (err) {
            toast('bad', err instanceof ApiRequestError ? err.message : 'Failed to load user');
        }
    };

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!data) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div className="card">
            <h3>All users</h3>
            <p className="card__sub">{data.pagination.total} accounts</p>

            <div className="searchbox">
                <input
                    className="input"
                    placeholder="Search name or email…"
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setPage(1);
                    }}
                />
                <select className="select" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
                    <option value="">All roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                </select>
                <select className="select" value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }}>
                    <option value="">Any KYC</option>
                    <option value="true">Verified</option>
                    <option value="false">Not verified</option>
                </select>
                <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                    <option value="">Any status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                </select>
            </div>

            <table className="table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>BVN</th>
                        <th>KYC</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {data.users.map((u) => {
                        const isSelf = u.id === me?.id;
                        const isLastAdmin = u.role === 'admin' && data.users.filter((x) => x.role === 'admin').length === 1;
                        return (
                            <tr key={u.id}>
                                <td>
                                    <b>{u.name}{isSelf ? ' (you)' : ''}</b>
                                    <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{u.email}</div>
                                </td>
                                <td style={{ fontSize: 13 }}>{u.bvnLast4}</td>
                                <td>
                                    <Badge tone={u.isVerified ? 'ok' : 'warn'}>{u.isVerified ? 'Verified' : 'Pending'}</Badge>
                                </td>
                                <td>
                                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <Badge tone={u.role === 'admin' ? 'gold' : 'neutral'}>{u.role}</Badge>
                                        <Badge tone={u.status === 'suspended' ? 'bad' : 'ok'}>{u.status}</Badge>
                                    </span>
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{formatDate(u.createdAt)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        <button className="btn btn--sm btn--ghost" onClick={() => openDetail(u.id)}>
                                            Overview
                                        </button>
                                        {!isSelf && (
                                            u.status === 'active' ? (
                                                <button className="btn btn--sm btn--ghost" disabled={busyId === u.id} onClick={() => act(u.id, 'suspend', `Suspend ${u.name}? They will be signed out immediately.`)}>
                                                    Suspend
                                                </button>
                                            ) : (
                                                <button className="btn btn--sm btn--ghost" disabled={busyId === u.id} onClick={() => act(u.id, 'activate', `Re-activate ${u.name}?`)}>
                                                    Activate
                                                </button>
                                            )
                                        )}
                                        {!isSelf && u.role === 'user' && (
                                            <button className="btn btn--sm btn--ghost" disabled={busyId === u.id} onClick={() => act(u.id, 'promote', `Make ${u.name} an admin?`)}>
                                                Promote
                                            </button>
                                        )}
                                        {!isSelf && u.role === 'admin' && !isLastAdmin && (
                                            <button className="btn btn--sm btn--ghost" disabled={busyId === u.id} onClick={() => act(u.id, 'demote', `Demote ${u.name} to a regular user?`)}>
                                                Demote
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {data.users.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ color: 'var(--ink-faint)' }}>No users match these filters.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {data.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <button className="btn btn--sm btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        ← Newer
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: 13.5, color: 'var(--ink-faint)' }}>
                        Page {data.pagination.page} of {data.pagination.totalPages}
                    </span>
                    <button className="btn btn--sm btn--ghost" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                        Older →
                    </button>
                </div>
            )}

            {detail && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="User overview"
                    style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(16,25,21,0.5)', display: 'grid', placeItems: 'center', padding: 20 }}
                    onClick={(e) => e.target === e.currentTarget && setDetail(null)}
                >
                    <div className="card" style={{ width: 'min(100%, 560px)', maxHeight: '86vh', overflow: 'auto', position: 'relative' }}>
                        <button className="iconbtn" style={{ position: 'absolute', top: 14, right: 14 }} onClick={() => setDetail(null)} aria-label="Close">
                            ✕
                        </button>
                        <h3>{detail.user.name}</h3>
                        <p className="card__sub">
                            {detail.user.email}
                            {detail.user.phone ? ` · ${detail.user.phone}` : ''} · {detail.user.bvnLast4}
                        </p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                            <Badge tone={detail.user.role === 'admin' ? 'gold' : 'neutral'}>{detail.user.role}</Badge>
                            <Badge tone={detail.user.status === 'suspended' ? 'bad' : 'ok'}>{detail.user.status}</Badge>
                            <Badge tone={detail.user.isVerified ? 'ok' : 'warn'}>{detail.user.isVerified ? 'KYC verified' : 'KYC pending'}</Badge>
                            <Badge tone={detail.user.emailVerified ? 'ok' : 'warn'}>{detail.user.emailVerified ? 'email verified' : 'email unverified'}</Badge>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 14 }}>
                            Joined {formatDate(detail.user.createdAt)}
                            {detail.user.lastLoginAt ? ` · last active ${formatDate(detail.user.lastLoginAt)}` : ''}
                        </p>

                        <b style={{ fontSize: 14 }}>Contributions ({detail.contributions.length})</b>
                        <div style={{ margin: '8px 0 14px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                            {detail.contributions.length === 0 && <span style={{ color: 'var(--ink-faint)' }}>None yet.</span>}
                            {detail.contributions.map((c) => (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                                    <span>{c.label ?? 'Contribution'} · {formatDate(c.createdAt)}</span>
                                    <b>{formatNgn(c.amount)} · {c.status}</b>
                                </div>
                            ))}
                        </div>

                        <b style={{ fontSize: 14 }}>Payments ({detail.payments.length})</b>
                        <div style={{ margin: '8px 0 14px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                            {detail.payments.length === 0 && <span style={{ color: 'var(--ink-faint)' }}>None yet.</span>}
                            {detail.payments.map((p) => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                                    <span>{formatDate(p.createdAt)}{p.proofStatus ? ` · proof ${p.proofStatus}` : ''}</span>
                                    <b>{formatNgn(p.amount)} · {p.status}</b>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
