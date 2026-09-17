import { useCallback, useEffect, useState } from 'react';
import { api, ApiRequestError } from '../../api/client';
import type { VerificationRecord } from '../../api/types';
import { Badge, Field, toast } from '../../components/ui';
import { formatDate } from '../../utils/format';

interface Status {
    isVerified: boolean;
    latest: VerificationRecord | null;
}

const FACE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

export default function VerificationPage() {
    const [status, setStatus] = useState<Status | null>(null);
    const [history, setHistory] = useState<VerificationRecord[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [face, setFace] = useState<File | null>(null);
    const [video, setVideo] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const load = useCallback(() => {
        Promise.all([
            api.get<Status>('/verification/status'),
            api.get<{ verifications: VerificationRecord[] }>('/verification/history'),
        ])
            .then(([s, h]) => {
                setStatus(s);
                setHistory(h.verifications);
            })
            .catch((e) => setError(e instanceof ApiRequestError ? e.message : 'Failed to load verification status'));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        if (!face || !video) {
            setSubmitError('Please choose both your facial photo and liveness video.');
            return;
        }
        if (!FACE_TYPES.includes(face.type)) {
            setSubmitError('Facial photo must be a JPG, PNG, WEBP or HEIC image.');
            return;
        }
        if (!VIDEO_TYPES.includes(video.type)) {
            setSubmitError('Liveness video must be an MP4 or WEBM file.');
            return;
        }
        if (face.size > 5 * 1024 * 1024) {
            setSubmitError('Facial photo must be 5 MB or smaller.');
            return;
        }
        if (video.size > 50 * 1024 * 1024) {
            setSubmitError('Liveness video must be 50 MB or smaller.');
            return;
        }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('facialImage', face);
            fd.append('livenessVideo', video);
            await api.post('/verification/submit', { form: fd });
            toast('ok', 'Verification submitted for review');
            setFace(null);
            setVideo(null);
            load();
        } catch (err) {
            setSubmitError(err instanceof ApiRequestError ? err.message : 'Submission failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    if (error) return <div className="form-error" role="alert">{error}</div>;
    if (!status) return <div className="page-loader"><span className="spinner" /></div>;

    const latest = status.latest;
    const canSubmit = !status.isVerified && (!latest || latest.status === 'rejected');

    return (
        <div>
            <div className="page-head">
                <span className="eyebrow">Identity</span>
                <h1>Identity verification</h1>
                <p>One-time check: a clear facial photo and a short liveness clip. Our team reviews it, then your account is fully trusted.</p>
            </div>

            <div className="pay-grid">
                <div className="card">
                    <h3>Your status</h3>
                    <p className="card__sub">Exactly where you stand — no guessing.</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {status.isVerified ? <Badge tone="ok">Verified</Badge> : latest?.status === 'pending' ? <Badge tone="warn">Under review</Badge> : latest?.status === 'rejected' ? <Badge tone="bad">Needs a retry</Badge> : <Badge>Not started</Badge>}
                    </div>
                    {latest?.status === 'rejected' && latest.rejectReason && (
                        <div className="form-error" style={{ marginTop: 14 }}>
                            <b>Why it was rejected:</b> {latest.rejectReason}
                        </div>
                    )}
                    {status.isVerified && (
                        <p style={{ marginTop: 14, color: 'var(--ink-soft)', fontSize: 14.5 }}>
                            Verified on {formatDate(latest?.reviewedAt ?? latest?.updatedAt)}. Nothing more to do here.
                        </p>
                    )}
                    {latest?.status === 'pending' && (
                        <p style={{ marginTop: 14, color: 'var(--ink-soft)', fontSize: 14.5 }}>
                            Submitted {formatDate(latest.createdAt)}. We usually review within one business day —
                            you’ll get a notification either way.
                        </p>
                    )}
                    {history.length > 1 && (
                        <div style={{ marginTop: 18, borderTop: '1px solid var(--line-soft)', paddingTop: 14 }}>
                            <b style={{ fontSize: 14 }}>History</b>
                            <ul className="timeline" style={{ marginTop: 10 }}>
                                {history.map((h) => (
                                    <li key={h.id} className={h.status === 'approved' ? 'is-done' : ''}>
                                        {h.status} — {formatDate(h.createdAt)}
                                        {h.rejectReason ? ` · ${h.rejectReason}` : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="card">
                    {canSubmit ? (
                        <>
                            <h3>{latest?.status === 'rejected' ? 'Submit again' : 'Submit your verification'}</h3>
                            <p className="card__sub">
                                Face the camera in good light. For the video, hold your phone ~30 cm away and slowly turn your head left, right, up, down.
                            </p>
                            {submitError && <div className="form-error">{submitError}</div>}
                            <form onSubmit={submit}>
                                <Field id="v-face" label="Facial photo" hint="JPG, PNG, WEBP or HEIC · up to 5 MB">
                                    <label className="filepick" htmlFor="v-face">
                                        {face ? (
                                            <>
                                                <b>{face.name}</b>
                                                <span>{(face.size / 1024 / 1024).toFixed(2)} MB — click to replace</span>
                                            </>
                                        ) : (
                                            <>
                                                <b>Choose a clear front-facing photo</b>
                                                <span>Neutral expression, no filters or heavy sunglasses</span>
                                            </>
                                        )}
                                    </label>
                                    <input
                                        id="v-face"
                                        type="file"
                                        accept={FACE_TYPES.join(',')}
                                        style={{ display: 'none' }}
                                        onChange={(e) => setFace(e.target.files?.[0] ?? null)}
                                    />
                                </Field>
                                <Field id="v-video" label="Liveness video" hint="MP4 or WEBM · up to 50 MB · 10–30 seconds is ideal">
                                    <label className="filepick" htmlFor="v-video">
                                        {video ? (
                                            <>
                                                <b>{video.name}</b>
                                                <span>{(video.size / 1024 / 1024).toFixed(2)} MB — click to replace</span>
                                            </>
                                        ) : (
                                            <>
                                                <b>Choose your liveness clip</b>
                                                <span>Turn your head slowly in all directions</span>
                                            </>
                                        )}
                                    </label>
                                    <input
                                        id="v-video"
                                        type="file"
                                        accept={VIDEO_TYPES.join(',')}
                                        style={{ display: 'none' }}
                                        onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
                                    />
                                </Field>
                                <button className="btn btn--block" type="submit" disabled={busy}>
                                    {busy ? 'Uploading…' : latest?.status === 'rejected' ? 'Resubmit verification' : 'Submit for review'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="empty" style={{ padding: '30px 10px' }}>
                            <div className="empty__mark" aria-hidden="true">
                                {status.isVerified ? '✓' : '⏳'}
                            </div>
                            <h3 className="empty__title">{status.isVerified ? 'You’re fully verified' : 'Your verification is being reviewed'}</h3>
                            <p className="empty__body">
                                {status.isVerified
                                    ? 'Your identity has been confirmed. This keeps your contributions and proofs protected.'
                                    : 'No action needed while we review. You’ll be notified the moment a decision is made.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
