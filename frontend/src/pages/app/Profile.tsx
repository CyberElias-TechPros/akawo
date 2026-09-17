import { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { api, ApiRequestError } from '../../api/client';
import { Field, toast } from '../../components/ui';

export default function Profile() {
    const { user, refreshUser, logout } = useAuth();
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [profileMsg, setProfileMsg] = useState<string | null>(null);
    const [profileErr, setProfileErr] = useState<string | null>(null);
    const [busyProfile, setBusyProfile] = useState(false);

    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const [pwMsg, setPwMsg] = useState<string | null>(null);
    const [pwErr, setPwErr] = useState<string | null>(null);
    const [busyPw, setBusyPw] = useState(false);

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg(null);
        setProfileErr(null);
        setBusyProfile(true);
        try {
            await api.put('/users/profile', { body: { name, phone: phone || '' } });
            await refreshUser();
            toast('ok', 'Profile updated');
            setProfileMsg('Profile saved.');
        } catch (err) {
            setProfileErr(err instanceof ApiRequestError ? err.message : 'Failed to update profile');
        } finally {
            setBusyProfile(false);
        }
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMsg(null);
        setPwErr(null);
        if (pw.next !== pw.confirm) {
            setPwErr('New passwords do not match.');
            return;
        }
        setBusyPw(true);
        try {
            await api.put('/users/password', { body: { currentPassword: pw.current, newPassword: pw.next } });
            setPwMsg('Password updated. Sign in again with your new password.');
            setPw({ current: '', next: '', confirm: '' });
            window.setTimeout(async () => {
                await logout();
                window.location.href = '/login';
            }, 1800);
        } catch (err) {
            setPwErr(err instanceof ApiRequestError ? err.message : 'Failed to change password');
        } finally {
            setBusyPw(false);
        }
    };

    return (
        <div>
            <div className="page-head">
                <span className="eyebrow">Account</span>
                <h1>Your profile</h1>
                <p>The details we use for your account. Your BVN is stored encrypted and never shown again.</p>
            </div>

            <div className="pay-grid">
                <div className="card">
                    <h3>Personal details</h3>
                    <p className="card__sub">Name and phone.</p>
                    {profileErr && <div className="form-error">{profileErr}</div>}
                    {profileMsg && <div className="form-ok">{profileMsg}</div>}
                    <form onSubmit={saveProfile} noValidate>
                        <Field id="pf-name" label="Full name">
                            <input id="pf-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                        </Field>
                        <Field id="pf-phone" label="Phone number (optional)" hint="e.g. 0803 123 4567">
                            <input id="pf-phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </Field>
                        <Field id="pf-email" label="Email address">
                            <input id="pf-email" className="input" value={user?.email ?? ''} disabled />
                            <p className="field__hint">Email cannot be changed. {user?.emailVerified ? 'Verified.' : 'Not verified yet.'}</p>
                        </Field>
                        <button className="btn" type="submit" disabled={busyProfile}>
                            {busyProfile ? 'Saving…' : 'Save changes'}
                        </button>
                    </form>
                </div>

                <div className="card">
                    <h3>Change password</h3>
                    <p className="card__sub">
                        Changing your password signs you out of every device. You’ll need your new password to sign back in.
                    </p>
                    {pwErr && <div className="form-error">{pwErr}</div>}
                    {pwMsg && <div className="form-ok" role="status">{pwMsg}</div>}
                    <form onSubmit={savePassword} noValidate>
                        <Field id="pw-current" label="Current password">
                            <input id="pw-current" className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw((f) => ({ ...f, current: e.target.value }))} required />
                        </Field>
                        <Field id="pw-next" label="New password" hint="At least 8 characters, with a letter and a number.">
                            <input id="pw-next" className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw((f) => ({ ...f, next: e.target.value }))} required />
                        </Field>
                        <Field id="pw-confirm" label="Confirm new password">
                            <input id="pw-confirm" className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))} required />
                        </Field>
                        <button className="btn" type="submit" disabled={busyPw}>
                            {busyPw ? 'Updating…' : 'Update password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
