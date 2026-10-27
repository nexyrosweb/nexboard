import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi, type AuthStatus, type AuthUser } from '../api/auth';

type AuthContextValue = {
  loading: boolean;
  authEnabled: boolean;
  setupRequired: boolean;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setup: (input: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AuthStatus>({
    authEnabled: false,
    setupRequired: false,
    user: null,
  });

  const refresh = useCallback(async () => {
    const next = await authApi.status();
    setStatus(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await authApi.status();
        if (!cancelled) setStatus(next);
      } catch {
        if (!cancelled) {
          setStatus({ authEnabled: false, setupRequired: false, user: null });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    setStatus((s) => ({
      ...s,
      authEnabled: true,
      setupRequired: false,
      user: res.user,
    }));
  }, []);

  const setup = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const res = await authApi.setup(input);
      setStatus({
        authEnabled: true,
        setupRequired: false,
        user: res.user,
      });
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setStatus((s) => ({ ...s, user: null }));
  }, []);

  const value = useMemo(
    () => ({
      loading,
      authEnabled: status.authEnabled,
      setupRequired: status.setupRequired,
      user: status.user,
      refresh,
      login,
      setup,
      logout,
    }),
    [loading, status, refresh, login, setup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
