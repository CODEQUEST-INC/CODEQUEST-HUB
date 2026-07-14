import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { tokenStorage } from './tokenStorage';

type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: Status;
  user: authApi.UserResponse | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (req: authApi.RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<authApi.UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await tokenStorage.get();
        if (!storedToken) {
          setStatus('signedOut');
          return;
        }
        const me = await authApi.me(storedToken);
        setToken(storedToken);
        setUser(me);
        setStatus('signedIn');
      } catch {
        await tokenStorage.clear().catch(() => {});
        setStatus('signedOut');
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const resp = await authApi.login({ email, password });
    await tokenStorage.set(resp.token);
    setToken(resp.token);
    setUser(resp.user);
    setStatus('signedIn');
  };

  const register = async (req: authApi.RegisterRequest) => {
    const resp = await authApi.register(req);
    await tokenStorage.set(resp.token);
    setToken(resp.token);
    setUser(resp.user);
    setStatus('signedIn');
  };

  const logout = async () => {
    await tokenStorage.clear();
    setToken(null);
    setUser(null);
    setStatus('signedOut');
  };

  const value = useMemo(
    () => ({ status, user, token, login, register, logout }),
    [status, user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
