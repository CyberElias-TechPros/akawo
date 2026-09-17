import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/* ------------------------------ form field ------------------------------ */

interface FieldProps {
    id: string;
    label: string;
    hint?: string;
    children: ReactNode;
}

export function Field({ id, label, hint, children }: FieldProps) {
    return (
        <div className="field">
            <label className="field__label" htmlFor={id}>
                {label}
            </label>
            {children}
            {hint && <p className="field__hint">{hint}</p>}
        </div>
    );
}

/* -------------------------------- badge -------------------------------- */

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'gold'; children: ReactNode }) {
    return <span className={`badge badge--${tone}`}>{children}</span>;
}

/* ------------------------------- stat card ------------------------------ */

export function StatCard({
    label,
    value,
    sub,
    tone = 'default',
}: {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: 'default' | 'gold' | 'green';
}) {
    return (
        <div className={`statcard statcard--${tone}`}>
            <p className="statcard__label">{label}</p>
            <p className="statcard__value">{value}</p>
            {sub && <p className="statcard__sub">{sub}</p>}
        </div>
    );
}

/* --------------------------- contribution ring --------------------------- */

export function ContributionRing({
    percent,
    size = 120,
    stroke = 10,
    label,
    sub,
}: {
    percent: number;
    size?: number;
    stroke?: number;
    label?: ReactNode;
    sub?: ReactNode;
}) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, percent));
    const offset = c - (clamped / 100) * c;
    return (
        <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(clamped)}%`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={r} className="ring__track" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    className="ring__fill"
                    strokeWidth={stroke}
                    fill="none"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            <div className="ring__center">
                {label && <span className="ring__label">{label}</span>}
                {sub && <span className="ring__sub">{sub}</span>}
            </div>
        </div>
    );
}

/* ------------------------------ empty state ------------------------------ */

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="empty">
            <div className="empty__mark" aria-hidden="true">
                ◌
            </div>
            <h3 className="empty__title">{title}</h3>
            {body && <p className="empty__body">{body}</p>}
            {action}
        </div>
    );
}

/* -------------------------------- toast -------------------------------- */

type ToastKind = 'ok' | 'bad';
interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
}

let pushCounter = 0;
const listeners = new Set<(t: ToastItem) => void>();

export function toast(kind: ToastKind, message: string) {
    const item = { id: ++pushCounter, kind, message };
    listeners.forEach((l) => l(item));
}

export function Toaster() {
    const [items, setItems] = useState<ToastItem[]>([]);

    useEffect(() => {
        const onToast = (t: ToastItem) => {
            setItems((cur) => [...cur, t]);
            window.setTimeout(() => {
                setItems((cur) => cur.filter((x) => x.id !== t.id));
            }, 4200);
        };
        listeners.add(onToast);
        return () => {
            listeners.delete(onToast);
        };
    }, []);

    return (
        <div className="toaster" aria-live="polite">
            {items.map((t) => (
                <div key={t.id} className={`toast toast--${t.kind}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

