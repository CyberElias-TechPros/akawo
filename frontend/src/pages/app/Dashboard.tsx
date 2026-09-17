import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api, ApiRequestError } from '../../api/client';
import type { Dashboard } from '../../api/types';
import { Badge, StatCard } from '../../components/ui';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate, formatNgn, timeAgo } from '../../utils/format';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DashboardPage() {
    const { user, refreshUser } = useAuth();
    const [data, setData] = useState<Dashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const reduced = useReducedMotion() ?? false;

    useEffect(() => {
        api
            .get<Dashboard>('/users/dashboard')
            .then(setData)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load dashboard'));
    }, []);

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!data) return <div className="page-loader"><span className="spinner" /></div>;

    const s = data.summary;
    const name = user?.name ?? data.user.name;
    const firstName = name.split(' ')[0];

    return (
        <div>
            <div className="page-head" style={{ marginTop: 22 }}>
                <span className="eyebrow">Dashboard</span>
                <h1>Good {greeting()}, {firstName}</h1>
                <p>Here’s where your savings stand right now.</p>
            </div>

            {!data.verification.isVerified && (
                <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid var(--gold)' }}>
                    <b>Verify your identity to unlock full trust</b>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '4px 0 12px' }}>
                        A quick facial photo and liveness clip. Reviewed by our team, usually within a day.
                    </p>
                    <Link to="/dashboard/verification" className="btn btn--sm">
                        Verify now
                    </Link>
                </div>
            )}
            {!data.verification.emailVerified && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <b>Email not verified</b>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '4px 0' }}>
                        We sent a verification link to <b>{data.user.email}</b>. It expires in 24 hours.
                    </p>
                </div>
            )}

            <div className="statgrid" style={{ marginBottom: 16 }}>
                <motion.div
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                >
                    <StatCard tone="gold" label="Total contributed" value={formatNgn(s.totalContributed)} sub={`${s.paidCount} contribution${s.paidCount === 1 ? '' : 's'} paid`} />
                </motion.div>
                <StatCard label="Pending amount" value={formatNgn(s.pendingAmount)} sub={`${s.pendingCount} awaiting payment`} />
                <StatCard label="Monthly commitments" value={formatNgn(s.monthlyTotal)} sub="recurring, per month" />
            </div>

            <div className="dash-grid">
                <div className="dash-main">
                    {data.nextContribution ? (
                        <div className="nextdue">
                            <div className="nextdue__info">
                                <b>
                                    {data.nextContribution.label ?? 'Next contribution'}
                                </b>
                                <span>
                                    {formatNgn(data.nextContribution.amount)} · due {formatDate(data.nextContribution.dueDate)}
                                </span>
                                {data.nextContribution.overdue && (
                                    <div style={{ marginTop: 6 }}>
                                        <Badge tone="bad">Overdue</Badge>
                                    </div>
                                )}
                            </div>
                            <Link to={`/dashboard/contribute/${data.nextContribution.id}`} className="btn btn--gold">
                                Pay now
                            </Link>
                        </div>
                    ) : (
                        <div className="card">
                            <b>No pending contributions</b>
                            <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '4px 0 14px' }}>
                                You’re all paid up. Start a new contribution whenever you’re ready.
                            </p>
                            <Link to="/dashboard/contributions" className="btn btn--sm">
                                New contribution
                            </Link>
                        </div>
                    )}

                    <div className="card">
                        <h3>Recent contributions</h3>
                        <p className="card__sub">Your last five, newest first.</p>
                        <div className="rowlist">
                            {data.recentContributions.length === 0 && (
                                <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nothing yet — create your first contribution.</p>
                            )}
                            {data.recentContributions.map((c) => (
                                <div className="rowcard" key={c.id} style={{ boxShadow: 'none', padding: '12px 4px', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--line-soft)', borderRadius: 0 }}>
                                    <div className="rowcard__main">
                                        <b>{c.label ?? 'Contribution'}</b>
                                        <span>
                                            {c.frequency === 'monthly' ? 'Monthly · ' : ''}
                                            {c.status === 'paid' ? `Paid ${timeAgo(c.paidAt)}` : `Due ${formatDate(c.dueDate)}`}
                                        </span>
                                    </div>
                                    <span className="rowcard__amount">{formatNgn(c.amount)}</span>
                                    <Badge tone={c.status === 'paid' ? 'ok' : c.overdue ? 'bad' : 'warn'}>
                                        {c.status === 'paid' ? 'Paid' : c.overdue ? 'Overdue' : 'Pending'}
                                    </Badge>
                                    {c.status === 'pending' && (
                                        <Link to={`/dashboard/contribute/${c.id}`} className="btn btn--sm btn--ghost">
                                            Pay
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3>Recent payments</h3>
                        <p className="card__sub">How money moved in, most recent first.</p>
                        <div className="rowlist">
                            {data.recentPayments.length === 0 && (
                                <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>No payments yet.</p>
                            )}
                            {data.recentPayments.map((p) => (
                                <div className="rowcard" key={p.id} style={{ boxShadow: 'none', padding: '12px 4px', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid var(--line-soft)', borderRadius: 0 }}>
                                    <div className="rowcard__main">
                                        <b>{p.label ?? 'Payment'}</b>
                                        <span>{timeAgo(p.createdAt)} · {p.gateway}</span>
                                    </div>
                                    <span className="rowcard__amount">{formatNgn(p.amount)}</span>
                                    <Badge tone={p.status === 'completed' ? 'ok' : p.status === 'failed' ? 'bad' : 'warn'}>
                                        {p.status === 'pending_verification' ? 'Proof in review' : p.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dash-side">
                    <div className="card">
                        <h3>Identity</h3>
                        <p className="card__sub">Your trust level on Akawo.</p>
                        <div className="ticks">
                            <div className="tick">
                                <span className="dot" style={{ background: data.verification.isVerified ? 'var(--forest)' : 'var(--line)' }} />
                                {data.verification.isVerified ? 'KYC verified' : 'KYC not yet verified'}
                            </div>
                            <div className="tick">
                                <span className="dot" style={{ background: data.verification.emailVerified ? 'var(--forest)' : 'var(--line)' }} />
                                {data.verification.emailVerified ? 'Email verified' : 'Email not verified'}
                            </div>
                        </div>
                        <Link to="/dashboard/verification" className="btn btn--ghost btn--sm btn--block" style={{ marginTop: 14 }}>
                            {data.verification.isVerified ? 'View verification' : 'Start verification'}
                        </Link>
                    </div>

                    <div className="card">
                        <h3>Notifications</h3>
                        <p className="card__sub">
                            {data.unreadNotifications > 0
                                ? `${data.unreadNotifications} unread`
                                : 'You’re all caught up.'}
                            {data.proofsAwaitingReview > 0 && ` · ${data.proofsAwaitingReview} proof${data.proofsAwaitingReview === 1 ? '' : 's'} in review`}
                        </p>
                        <Link to="/dashboard/notifications" className="btn btn--ghost btn--sm">
                            Open inbox
                        </Link>
                    </div>

                    {data.user.role === 'admin' && (
                        <div className="card" style={{ background: 'var(--forest-deep)', color: '#fff', border: 'none' }}>
                            <h3 style={{ color: '#fff' }}>Admin console</h3>
                            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 13.5 }}>
                                You have administrator access to Akawo.
                            </p>
                            <Link to="/admin" className="btn btn--gold btn--sm" onClick={() => refreshUser()}>
                                Open admin
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}
