import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth.api';
import { setAccessToken } from '../api/axiosInstance';
import { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to refresh token to restore session
  useEffect(() => {
    const restore = async () => {
      // If we are currently on the OAuth callback page, skip automatic restore
      // because the callback flow will set the access token directly.
      if (typeof window !== 'undefined' && window.location.pathname === '/oauth/callback') {
        setIsLoading(false);
        return;
      }

      try {
        const { accessToken, user: userData } = await authApi.refresh();
        setAccessToken(accessToken);
        setUser(userData);
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  const login = useCallback((accessToken: string, userData: AuthUser) => {
    setAccessToken(accessToken);
    setUser(userData);
  }, []);

  const updateUser = useCallback((userData: AuthUser) => {
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
