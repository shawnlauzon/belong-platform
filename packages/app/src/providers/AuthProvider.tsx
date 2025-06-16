import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '@belongnetwork/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Use a suspense boundary to handle the API hook
  const [authState, setAuthState] = React.useState<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  React.useEffect(() => {
    // Set a timeout to avoid hanging forever
    const timeout = setTimeout(() => {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}