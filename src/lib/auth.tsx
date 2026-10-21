import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, authApi, setUnauthorizedHandler, tokenStore } from '@/api';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  /** Sessiya bor, lekin server javob bermayapti — qayta urinilmoqda */
  reconnecting: boolean;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(() => !!tokenStore.get());
  const [reconnecting, setReconnecting] = React.useState(false);
  const queryClient = useQueryClient();

  const logout = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  React.useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    // Tarmoq yoki server xatosida (masalan, yangilanish paytida) token o'chirilmaydi va login sahifasiga
    // otilmaydi — server qaytguncha qayta urinamiz. Faqat yaroqsiz token (401) chiqaradi.
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      authApi.me()
        .then((u) => { if (!cancelled) { setUser(u); setReconnecting(false); setLoading(false); } })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 401) { logout(); setReconnecting(false); setLoading(false); return; }
          setReconnecting(true);
          timer = setTimeout(attempt, 3000);
        });
    };
    attempt();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [logout]);

  const login = React.useCallback(async (phone: string, password: string) => {
    const { token, user: u } = await authApi.login(phone, password);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const value = React.useMemo(() => ({ user, loading, reconnecting, login, logout }), [user, loading, reconnecting, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth faqat AuthProvider ichida ishlaydi');
  return ctx;
}

export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('Foydalanuvchi yo\'q');
  return user;
}

export const isFinance = (role: UserRole) => role === 'ADMIN' || role === 'MANAGER';

// Har bir rol tizimga kirgach o'z ish joyiga tushadi
export const HOME_BY_ROLE: Record<UserRole, string> = {
  ADMIN: '/',
  MANAGER: '/',
  DESIGNER: '/design',
  PRINTER: '/production',
  INSTALLER: '/installation',
};

export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const user = useUser();
  if (!roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}
