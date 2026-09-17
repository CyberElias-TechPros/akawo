/** Input validation — all client data is untrusted. */

export const isEmail = (v: unknown): v is string =>
    typeof v === 'string' &&
    v.length >= 6 &&
    v.length <= 254 &&
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);

export const isName = (v: unknown): v is string =>
    typeof v === 'string' && v.trim().length >= 2 && v.trim().length <= 120;

/** Nigerian Bank Verification Number: 11 digits, typically starts 20/21/22/30. */
export const isBVN = (v: unknown): v is string => {
    if (typeof v !== 'string') return false;
    const digits = v.replace(/\s+/g, '');
    return /^\d{11}$/.test(digits);
};

/** Nigerian phone: +234 / 234 / 0 prefix, 10-11 significant digits. */
export const isPhone = (v: unknown): v is string => {
    if (typeof v !== 'string') return false;
    const d = v.replace(/[\s()-]/g, '');
    return /^(\+?234|0)?[1-9]\d{9}$/.test(d);
};

export const isStrongPassword = (v: unknown): v is string =>
    typeof v === 'string' &&
    v.length >= 8 &&
    v.length <= 128 &&
    /[A-Za-z]/.test(v) &&
    /\d/.test(v);

/** Amount in NGN major units (number or numeric string), 1.00 ≤ x ≤ 10,000,000, ≤2 dp. */
export const isValidAmount = (v: unknown): v is number => {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) return false;
    if (n < 1 || n > 10_000_000) return false;
    return Math.round(n * 100) / 100 === n;
};

/** NGN major units → integer kobo. */
export const toKobo = (ngn: number): number => Math.round(ngn * 100);

export const isFrequency = (v: unknown): v is 'once' | 'monthly' =>
    v === 'once' || v === 'monthly';

/** ISO date (yyyy-mm-dd), not in the past (allow today), not > 2 years ahead. */
export const isFutureIsoDate = (v: unknown): v is string => {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const max = new Date(today);
    max.setUTCDate(max.getUTCDate() + 730);
    return d.getTime() >= today.getTime() - 86_400_000 && d.getTime() <= max.getTime();
};

/** Simple, strict label: printable text, ≤ 120 chars. */
export const isLabel = (v: unknown): v is string =>
    typeof v === 'string' && v.length <= 120 && /^[\p{L}\p{N}\p{M}\s.,'-]+$/u.test(v);
