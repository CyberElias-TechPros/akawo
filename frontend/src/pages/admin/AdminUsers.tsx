import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { api, ApiRequestError } from '../../api/client';
import type { AdminUser, Pagination } from '../../api/types';
import { Badge, toast } from '../../components/ui';
import { formatDate } from '../../utils/format';

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
        </div>
    );
}
