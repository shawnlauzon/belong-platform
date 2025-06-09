import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@belongnetwork/core';
import {
  logger,
  logComponentRender,
  logUserAction,
  logApiCall,
  logApiResponse,
} from '@belongnetwork/core';
import { SupabaseUser } from '@belongnetwork/core';

interface AuthContextType {
  user: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>(
  {} as AuthContextType
);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  logComponentRender('AuthProvider');

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.info('🔐 AuthProvider: Initializing auth state...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('❌ AuthProvider: Error getting initial session:', error);
      } else {
        logger.info('✅ AuthProvider: Initial session loaded:', {
          hasSession: !!session,
        });
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('🔐 AuthProvider: Auth state changed:', {
        event,
        hasSession: !!session,
      });
      setUser(session?.user ?? null);
    });

    return () => {
      logger.debug('🔐 AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    logUserAction('signIn', { email });
    logApiCall('POST', '/auth/signin', { email });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logApiResponse('POST', '/auth/signin', null, error);
      throw error;
    }

    logApiResponse('POST', '/auth/signin', { hasUser: !!data.user });
    logger.info('✅ AuthProvider: signIn successful');
  };

  const signUp = async (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => {
    logUserAction('signUp', { email, hasMetadata: !!metadata });
    logApiCall('POST', '/auth/signup', { email, metadata });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
          full_name: metadata
            ? `${metadata.firstName} ${metadata.lastName}`.trim()
            : '',
        },
      },
    });

    if (error) {
      logApiResponse('POST', '/auth/signup', null, error);
      throw error;
    }

    logApiResponse('POST', '/auth/signup', {
      hasUser: !!data.user,
      needsConfirmation: !data.session,
    });

    if (data.user && !data.session) {
      logger.info('📧 AuthProvider: User created but needs email confirmation');
    }
  };

  const signOut = async () => {
    logUserAction('signOut');
    logApiCall('POST', '/auth/signout');

    const { error } = await supabase.auth.signOut();

    if (error) {
      logApiResponse('POST', '/auth/signout', null, error);
      throw error;
    }

    logApiResponse('POST', '/auth/signout');
    logger.info('✅ AuthProvider: signOut successful');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
