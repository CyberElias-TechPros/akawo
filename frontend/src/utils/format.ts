/** NGN major units (number or numeric string) → "₦1,250,000.00". */
export function formatNgn(koboOrNgn: number, isKobo = false): string {
    const ngn = isKobo ? koboOrNgn / 100 : koboOrNgn;
    return `₦${ngn.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact: ₦1.2m / ₦350k / ₦1,250. */
export function formatNgnCompact(koboOrNgn: number): string {
    const ngn = koboOrNgn;
    if (ngn >= 1_000_000) return `₦${(ngn / 1_000_000).toLocaleString('en-NG', { maximumFractionDigits: 1 })}m`;
    if (ngn >= 1_000) return `₦${(ngn / 1_000).toLocaleString('en-NG', { maximumFractionDigits: 1 })}k`;
    return formatNgn(ngn);
}

/** "2026-09-17" → "17 Sep 2026". */
export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Relative time for "x ago" labels. */
export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return iso;
    const s = Math.max(0, (Date.now() - then) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return formatDate(iso);
}

export const todayIso = (): string => new Date().toISOString().slice(0, 10);
