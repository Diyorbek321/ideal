import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, authApi, setUnauthorizedHandler, tokenStore } from '@/api';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(() => !!tokenStore.get());
  const queryClient = useQueryClient();

  const logout = React.useCallback(() => {
    tokenStore.clear();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  React.useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) return;
    authApi.me()
      .then(setUser)
      // Tarmoq yoki server xatosida token o'chirilmaydi — faqat yaroqsiz bo'lsa
      .catch((err) => { if (err instanceof ApiError && err.status === 401) logout(); })
      .finally(() => setLoading(false));
  }, [logout]);

  const login = React.useCallback(async (phone: string, password: string) => {
    const { token, user: u } = await authApi.login(phone, password);
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const value = React.useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
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
