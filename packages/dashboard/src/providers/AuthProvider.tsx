import { createContext, useContext, useEffect, useState } from 'react';
import { useCurrentUser } from '@belongnetwork/api';
import type { AuthUser } from '@belongnetwork/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <AuthContext.Provider value={{ user: user || null, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}