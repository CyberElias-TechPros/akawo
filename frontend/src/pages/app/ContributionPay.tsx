import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiRequestError } from '../../api/client';
import type { Contribution, Payment } from '../../api/types';
import { Badge, Field, toast } from '../../components/ui';
import { formatDate, formatNgn } from '../../utils/format';

type Tab = 'card' | 'proof';
type Phase = 'choose' | 'done';

interface CardForm {
    cardNumber: string;
    expiry: string;
    cvv: string;
    name: string;
}

export default function ContributionPay() {
    const { id } = useParams<{ id: string }>();
    const [contrib, setContrib] = useState<Contribution | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('card');
    const [phase, setPhase] = useState<Phase>('choose');
    const [result, setResult] = useState<Payment | null>(null);

    const [card, setCard] = useState<CardForm>({ cardNumber: '', expiry: '', cvv: '', name: '' });
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        if (!id) return;
        api
            .get<{ contribution: Contribution }>(`/contributions/${id}`)
            .then((d) => setContrib(d.contribution))
            .catch((e) => setLoadError(e instanceof ApiRequestError ? e.message : 'Failed to load contribution'));
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const initiate = async (): Promise<string> => {
        const d = await api.post<{ payment: Payment }>('/payments/initiate', { body: { contributionId: id! } });
        return d.payment.id;
    };

    const onCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        setBusy(true);
        try {
            const paymentId = await initiate();
            const d = await api.post<{ payment: Payment; declined: boolean }>(`/payments/${paymentId}/charge`, {
                body: {
                    cardNumber: card.cardNumber.replace(/\s+/g, ''),
                    expiry: card.expiry,
                    cvv: card.cvv,
                    name: card.name,
                },
            });
            setResult(d.payment);
            setPhase('done');
            load();
            if (d.payment.status === 'completed') toast('ok', 'Payment successful');
        } catch (err) {
            setActionError(err instanceof ApiRequestError ? err.message : 'Payment failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const onProof = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError(null);
        if (!proofFile) {
            setActionError('Choose a screenshot of your transfer first.');
            return;
        }
        setBusy(true);
        try {
            const paymentId = await initiate();
            const fd = new FormData();
            fd.append('file', proofFile);
            const d = await api.post<{ payment: Payment }>(`/payments/${paymentId}/proof`, { form: fd });
            setResult(d.payment);
            setPhase('done');
            load();
        } catch (err) {
            setActionError(err instanceof ApiRequestError ? err.message : 'Upload failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    if (loadError) return <div className="form-error" role="alert">{loadError}</div>;
    if (!contrib) return <div className="page-loader"><span className="spinner" /></div>;

    const done = phase === 'done';

    return (
        <div>
            <div className="page-head">
                <span className="eyebrow">Contribute</span>
                <h1>{contrib.label ?? 'Make a payment'}</h1>
                <p>
                    {formatNgn(contrib.amount)}
                    {contrib.dueDate ? ` · due ${formatDate(contrib.dueDate)}` : ''}
                    {contrib.overdue ? ' — this is overdue, pay it today' : ''}
                </p>
            </div>

            <div className="pay-grid">
                <div className="card">
                    <h3>Where this stands</h3>
                    <ul className="timeline">
                        <li className={contrib.status === 'paid' ? 'is-done' : 'is-now'}>
                            Contribution created
                            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{formatDate(contrib.createdAt)}</div>
                        </li>
                        <li className={contrib.status === 'paid' ? 'is-done' : done && result?.status === 'pending_verification' ? 'is-done' : ''}>
                            Payment started
                            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                                {done ? (result?.status === 'pending_verification' ? 'Proof uploaded — awaiting review' : result?.status === 'completed' ? 'Card charged successfully' : 'Card attempt failed') : 'Choose a payment path below'}
                            </div>
                        </li>
                        <li className={contrib.status === 'paid' ? 'is-done' : ''}>
                            Confirmed as paid
                            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                                {contrib.paidAt ? formatDate(contrib.paidAt) : 'You’ll get a notification the moment it clears'}
                            </div>
                        </li>
                    </ul>
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        {contrib.status === 'paid' ? (
                            <Badge tone="ok">Paid in full</Badge>
                        ) : result?.status === 'pending_verification' ? (
                            <Badge tone="warn">Proof in review</Badge>
                        ) : result?.status === 'failed' ? (
                            <Badge tone="bad">Attempt failed{result.failureReason ? ` — ${result.failureReason}` : ''}</Badge>
                        ) : (
                            <Badge tone="warn">Awaiting payment</Badge>
                        )}
                    </div>
                    <div style={{ marginTop: 18 }}>
                        <Link to="/dashboard/contributions" className="btn btn--ghost btn--sm">
                            ← Back to contributions
                        </Link>
                    </div>
                </div>

                <div className="card">
                    {done ? (
                        <>
                            <h3>
                                {result?.status === 'completed'
                                    ? 'Payment complete'
                                    : result?.status === 'pending_verification'
                                      ? 'Proof received'
                                      : 'Not this time'}
                            </h3>
                            <p className="card__sub">
                                {result?.status === 'completed'
                                    ? 'Your contribution is now marked as paid. A receipt email is on its way.'
                                    : result?.status === 'pending_verification'
                                      ? 'Our team will review your transfer screenshot and confirm it — you’ll be notified with the outcome.'
                                      : `The gateway could not process this card${result?.failureReason ? ` (${result.failureReason})` : ''}. You can try again with a different card, or upload a bank transfer proof instead.`}
                            </p>
                            {result && (
                                <p style={{ fontSize: 13.5, color: 'var(--ink-faint)' }}>
                                    Reference: {result.gatewayReference ?? '—'} · {formatNgn(result.amount)}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                                {contrib.status === 'paid' ? (
                                    <Link to="/dashboard" className="btn">
                                        Back to dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <button className="btn" onClick={() => { setPhase('choose'); setActionError(null); }}>
                                            Try again
                                        </button>
                                        <Link to="/dashboard" className="btn btn--ghost">
                                            Later
                                        </Link>
                                    </>
                                )}
                            </div>
                        </>
                    ) : contrib.status === 'paid' ? (
                        <>
                            <h3>Already paid</h3>
                            <p className="card__sub">This contribution was confirmed on {formatDate(contrib.paidAt)}.</p>
                            <Link to="/dashboard" className="btn">
                                Back to dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            <h3>Pay {formatNgn(contrib.amount)}</h3>
                            <p className="card__sub">Two ways to settle. Both land in the same clean ledger.</p>
                            <div className="tabs" role="tablist">
                                <button role="tab" aria-selected={tab === 'card'} className={tab === 'card' ? 'is-active' : ''} onClick={() => setTab('card')}>
                                    Pay by card
                                </button>
                                <button role="tab" aria-selected={tab === 'proof'} className={tab === 'proof' ? 'is-active' : ''} onClick={() => setTab('proof')}>
                                    Transfer proof
                                </button>
                            </div>
                            {actionError && <div className="form-error" role="alert">{actionError}</div>}

                            {tab === 'card' && (
                                <form onSubmit={onCard} noValidate>
                                    <Field id="p-card" label="Card number">
                                        <input
                                            id="p-card"
                                            className="input"
                                            inputMode="numeric"
                                            placeholder="5396 0000 0000 0000"
                                            value={card.cardNumber}
                                            onChange={(e) => setCard((f) => ({ ...f, cardNumber: e.target.value.replace(/[^\d\s]/g, '').slice(0, 23) }))}
                                            required
                                        />
                                    </Field>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <Field id="p-exp" label="Expiry (MM/YY)">
                                            <input
                                                id="p-exp"
                                                className="input"
                                                placeholder="12/28"
                                                value={card.expiry}
                                                onChange={(e) => setCard((f) => ({ ...f, expiry: e.target.value.slice(0, 5) }))}
                                                required
                                            />
                                        </Field>
                                        <Field id="p-cvv" label="CVV">
                                            <input
                                                id="p-cvv"
                                                className="input"
                                                inputMode="numeric"
                                                placeholder="123"
                                                value={card.cvv}
                                                onChange={(e) => setCard((f) => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                                required
                                            />
                                        </Field>
                                    </div>
                                    <Field id="p-name" label="Name on card">
                                        <input
                                            id="p-name"
                                            className="input"
                                            placeholder="CHINEDU OKAFOR"
                                            value={card.name}
                                            onChange={(e) => setCard((f) => ({ ...f, name: e.target.value }))}
                                            required
                                        />
                                    </Field>
                                    <button className="btn btn--block" type="submit" disabled={busy}>
                                        {busy ? 'Processing…' : `Pay ${formatNgn(contrib.amount)}`}
                                    </button>
                                </form>
                            )}

                            {tab === 'proof' && (
                                <form onSubmit={onProof}>
                                    <label className="filepick" htmlFor="proof-file">
                                        {proofFile ? (
                                            <>
                                                <b>{proofFile.name}</b>
                                                <span>{(proofFile.size / 1024 / 1024).toFixed(2)} MB — click to replace</span>
                                            </>
                                        ) : (
                                            <>
                                                <b>Choose your transfer screenshot</b>
                                                <span>JPG, PNG, WEBP, HEIC or PDF · up to 8 MB</span>
                                            </>
                                        )}
                                    </label>
                                    <input
                                        id="proof-file"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                                        style={{ display: 'none' }}
                                        onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                                    />
                                    <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: '12px 0 16px' }}>
                                        Bank apps: copy the transfer confirmation screen. Our team reviews every proof
                                        and confirms the amount matches to the kobo.
                                    </p>
                                    <button className="btn btn--block" type="submit" disabled={busy || !proofFile}>
                                        {busy ? 'Uploading…' : 'Upload proof for review'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
