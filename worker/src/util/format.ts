/** Money & date formatting shared by API responses. */

export const koboToNgn = (kobo: number): number => kobo / 100;

export function formatNgn(kobo: number): string {
    const ngn = kobo / 100;
    return `₦${ngn.toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

export const nowIso = (): string => new Date().toISOString();

/** Mask BVN for display: ••• ••• •1234 */
export const maskBVN = (last4: string): string => `••• ••• •${last4}`;

/** Mask email for display: j***@gmail.com */
export const maskEmail = (email: string): string => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, 1);
    return `${visible}${'*'.repeat(Math.max(2, local.length - 1))}@${domain}`;
};

export function daysFromNowISO(days: number): string {
    const d = new Date(Date.now() + days * 86_400_000);
    return d.toISOString().slice(0, 10);
}
