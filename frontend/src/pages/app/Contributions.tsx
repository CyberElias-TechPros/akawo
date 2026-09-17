import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiRequestError } from '../../api/client';
import type { Contribution, Pagination } from '../../api/types';
import { Badge, EmptyState, Field, toast } from '../../components/ui';
import { formatDate, formatNgn, todayIso } from '../../utils/format';

interface ListResponse {
    contributions: Contribution[];
    pagination: Pagination;
}

export default function Contributions() {
    const [list, setList] = useState<ListResponse | null>(null);
    const [page, setPage] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState({ amount: '', dueDate: '', label: '', frequency: 'once' as 'once' | 'monthly' });
    const [formError, setFormError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<Contribution | null>(null);
    const [editForm, setEditForm] = useState({ label: '', dueDate: '', frequency: 'once' as 'once' | 'monthly' });
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback((p: number) => {
        api
            .get<ListResponse>(`/contributions?page=${p}`)
            .then(setList)
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load contributions'));
    }, []);

    useEffect(() => {
        load(page);
    }, [page, load]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setBusy(true);
        try {
            await api.post('/contributions', {
                body: {
                    amount: Number(form.amount),
                    dueDate: form.dueDate || undefined,
                    label: form.label || undefined,
                    frequency: form.frequency,
                },
            });
            toast('ok', 'Contribution created');
            setForm({ amount: '', dueDate: '', label: '', frequency: 'once' });
            load(1);
            setPage(1);
        } catch (err) {
            setFormError(err instanceof ApiRequestError ? err.message : 'Failed to create contribution');
        } finally {
            setBusy(false);
        }
    };

    const startEdit = (c: Contribution) => {
        setEditing(c);
        setEditForm({ label: c.label ?? '', dueDate: c.dueDate ?? '', frequency: c.frequency });
    };

    const saveEdit = async (c: Contribution) => {
        setFormError(null);
        setBusyId(c.id);
        try {
            await api.put(`/contributions/${c.id}`, {
                body: { label: editForm.label || '', dueDate: editForm.dueDate || null, frequency: editForm.frequency },
            });
            toast('ok', 'Contribution updated');
            setEditing(null);
            load(page);
        } catch (err) {
            setFormError(err instanceof ApiRequestError ? err.message : 'Failed to update contribution');
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (c: Contribution) => {
        if (!window.confirm(`Delete “${c.label ?? 'this contribution'}” (${formatNgn(c.amount)})? This cannot be undone.`)) return;
        setBusyId(c.id);
        try {
            await api.del(`/contributions/${c.id}`);
            toast('ok', 'Contribution deleted');
            load(page);
        } catch (err) {
            toast('bad', err instanceof ApiRequestError ? err.message : 'Failed to delete contribution');
        } finally {
            setBusyId(null);
        }
    };

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!list) return <div className="page-loader"><span className="spinner" /></div>;

    return (
        <div>
            <div className="page-head">
                <span className="eyebrow">Contributions</span>
                <h1>Your contributions</h1>
                <p>Every amount you’ve committed to, in one place. Pay by card or upload transfer proof when you’re ready.</p>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <h3>New contribution</h3>
                <p className="card__sub">Minimum ₦1.00 · maximum ₦10,000,000</p>
                {formError && <div className="form-error">{formError}</div>}
                <form onSubmit={create} noValidate>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                        <Field id="c-amount" label="Amount (₦)">
                            <input
                                id="c-amount"
                                className="input"
                                type="number"
                                min="1"
                                max="10000000"
                                step="0.01"
                                placeholder="e.g. 25000"
                                value={form.amount}
                                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                                required
                            />
                        </Field>
                        <Field id="c-due" label="Due date">
                            <input
                                id="c-due"
                                className="input"
                                type="date"
                                min={todayIso()}
                                value={form.dueDate}
                                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                            />
                        </Field>
                        <Field id="c-label" label="Label (optional)">
                            <input
                                id="c-label"
                                className="input"
                                placeholder="e.g. School fees"
                                maxLength={120}
                                value={form.label}
                                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                            />
                        </Field>
                        <Field id="c-freq" label="Frequency">
                            <select
                                id="c-freq"
                                className="select"
                                value={form.frequency}
                                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as 'once' | 'monthly' }))}
                            >
                                <option value="once">One-off</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </Field>
                    </div>
                    <button className="btn" type="submit" disabled={busy || !form.amount}>
                        {busy ? 'Creating…' : 'Create contribution'}
                    </button>
                </form>
            </div>

            {list.contributions.length === 0 ? (
                <EmptyState
                    title="No contributions yet"
                    body="Create your first contribution above — pick an amount and a due date, and Akawo will keep the rhythm."
                />
            ) : (
                <div className="rowlist">
                    {list.contributions.map((c) => (
                        <div className="rowcard" key={c.id}>
                            <div className="rowcard__main">
                                <b>{c.label ?? 'Contribution'}</b>
                                <span>
                                    {c.frequency === 'monthly' ? 'Monthly · ' : ''}
                                    {c.dueDate ? `due ${formatDate(c.dueDate)}` : 'no due date'}
                                    {c.paidAt ? ` · paid ${formatDate(c.paidAt)}` : ''}
                                </span>
                            </div>
                            <span className="rowcard__amount">{formatNgn(c.amount)}</span>
                            <Badge tone={c.status === 'paid' ? 'ok' : c.overdue ? 'bad' : 'warn'}>
                                {c.status === 'paid' ? 'Paid' : c.overdue ? 'Overdue' : 'Pending'}
                            </Badge>
                            {c.status === 'pending' && (
                                <Link to={`/dashboard/contribute/${c.id}`} className="btn btn--sm btn--gold">
                                    Pay
                                </Link>
                            )}
                            {(c.status === 'pending' || c.status === 'failed') && (
                                <button className="btn btn--sm btn--ghost" onClick={() => startEdit(c)}>
                                    Edit
                                </button>
                            )}
                            {(c.status === 'pending' || c.status === 'failed') && (
                                <button className="btn btn--sm btn--ghost" style={{ color: 'var(--red)' }} onClick={() => remove(c)} disabled={busyId === c.id}>
                                    Delete
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {list.pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 22 }}>
                    <button className="btn btn--sm btn--ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        ← Newer
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: 13.5, color: 'var(--ink-faint)' }}>
                        Page {list.pagination.page} of {list.pagination.totalPages}
                    </span>
                    <button
                        className="btn btn--sm btn--ghost"
                        disabled={page >= list.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Older →
                    </button>
                </div>
            )}

            {editing && (
                <div className="card" style={{ position: 'fixed', inset: '10% 10% auto auto', zIndex: 60, maxWidth: 460, margin: '0 auto', left: 0, right: 0, boxShadow: 'var(--shadow-2)' }}>
                    <h3>Edit contribution</h3>
                    {formError && <div className="form-error">{formError}</div>}
                    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                        <Field id="e-label" label="Label">
                            <input id="e-label" className="input" maxLength={120} value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} />
                        </Field>
                        <Field id="e-due" label="Due date">
                            <input id="e-due" className="input" type="date" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} />
                        </Field>
                        <Field id="e-freq" label="Frequency">
                            <select id="e-freq" className="select" value={editForm.frequency} onChange={(e) => setEditForm((f) => ({ ...f, frequency: e.target.value as 'once' | 'monthly' }))}>
                                <option value="once">One-off</option>
                                <option value="monthly">Monthly</option>
                            </select>
                        </Field>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                            <button className="btn btn--sm btn--ghost" onClick={() => setEditing(null)}>
                                Cancel
                            </button>
                            <button className="btn btn--sm" onClick={() => saveEdit(editing)} disabled={busyId === editing.id}>
                                {busyId === editing.id ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
