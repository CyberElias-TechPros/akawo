import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getRefreshToken, setAccessToken, storeTokens } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Restore session on first load (refresh token → /me).
    useEffect(() => {
        (async () => {
            try {
                const me = await api.get<{ user: User }>('/auth/me');
                setUser(me.user);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const data = await api.post<{ user: User; tokens: { accessToken: string; refreshToken: string } }>(
            '/auth/login',
            { body: { email, password } },
        );
        setAccessToken(data.tokens.accessToken);
        storeTokens(data.tokens);
        setUser(data.user);
        return data.user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout', { body: { refreshToken: getRefreshToken() } });
        } catch {
            /* best effort */
        }
        setAccessToken(null);
        storeTokens(null);
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const me = await api.get<{ user: User }>('/auth/me');
            setUser(me.user);
        } catch {
            setUser(null);
        }
    }, []);

    const value = useMemo(
        () => ({ user, loading, login, logout, refreshUser }),
        [user, loading, login, logout, refreshUser],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
