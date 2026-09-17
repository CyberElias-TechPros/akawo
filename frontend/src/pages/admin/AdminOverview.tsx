import { useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { AdminStats } from '../../api/types';
import { Badge, StatCard } from '../../components/ui';
import { formatNgn, timeAgo } from '../../utils/format';

export default function AdminOverview() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api
            .get<AdminStats>('/admin/stats')
            .then(setStats)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load stats'));
    }, []);

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!stats) return <div className="page-loader"><span className="spinner" /></div>;

    const s = stats;

    return (
        <div>
            <div className="statgrid" style={{ marginBottom: 20 }}>
                <StatCard
                    tone="gold"
                    label="Collected"
                    value={formatNgn(s.payments.completedTotal)}
                    sub={`${s.payments.completed} completed payments`}
                />
                <StatCard
                    label="Pending payments"
                    value={formatNgn(s.payments.pendingTotal)}
                    sub={`${s.payments.pending} in flight · ${s.payments.failed} failed`}
                />
                <StatCard
                    label="Contributions"
                    value={formatNgn(s.contributions.total)}
                    sub={`${s.contributions.count} total · ${formatNgn(s.contributions.pending)} pending`}
                />
                <StatCard
                    label="Users"
                    value={s.users.total}
                    sub={`${s.users.verified} KYC-verified · ${s.users.pendingKyc} pending`}
                />
            </div>

            <div className="dash-grid">
                <div className="card">
                    <h3>Recent payments</h3>
                    <p className="card__sub">Latest money in, across all users.</p>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>When</th>
                            </tr>
                        </thead>
                        <tbody>
                            {s.recentPayments.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <b>{p.name}</b>
                                        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{p.email}</div>
                                    </td>
                                    <td className="num">{formatNgn(p.amount)}</td>
                                    <td>
                                        <Badge tone={p.status === 'completed' ? 'ok' : p.status === 'failed' ? 'bad' : 'warn'}>{p.status}</Badge>
                                    </td>
                                    <td style={{ fontSize: 13, color: 'var(--ink-faint)' }}>{timeAgo(p.createdAt)}</td>
                                </tr>
                            ))}
                            {s.recentPayments.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ color: 'var(--ink-faint)' }}>No payments yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="dash-side">
                    <div className="card">
                        <h3>Top contributors</h3>
                        <p className="card__sub">By completed payment volume.</p>
                        <div className="ticks">
                            {s.topContributors.map((t, i) => (
                                <div className="tick" key={t.name}>
                                    <span className="dot" style={{ background: i === 0 ? 'var(--gold)' : 'var(--forest)' }} />
                                    <span style={{ flex: 1 }}>{i + 1}. {t.name}</span>
                                    <b>{formatNgn(t.total)}</b>
                                </div>
                            ))}
                            {s.topContributors.length === 0 && <span style={{ color: 'var(--ink-faint)', fontSize: 13.5 }}>No completed payments yet.</span>}
                        </div>
                    </div>

                    <div className="card">
                        <h3>KYC queue</h3>
                        <p className="card__sub">
                            {s.verifications.pending} pending · {s.verifications.approved} approved · {s.verifications.rejected} rejected
                        </p>
                        {s.users.emailUnverified > 0 && (
                            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{s.users.emailUnverified} users have not verified their email.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
