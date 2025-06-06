import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Initializing auth state...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ AuthProvider: Error getting initial session:', error);
      } else {
        console.log('✅ AuthProvider: Initial session loaded:', !!session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthProvider: Auth state changed:', event, !!session);
      setUser(session?.user ?? null);
    });

    return () => {
      console.log('🔐 AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 AuthProvider: signIn called for:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error('❌ AuthProvider: signIn error:', error);
      throw error;
    }
    
    console.log('✅ AuthProvider: signIn successful:', !!data.user);
  };

  const signUp = async (email: string, password: string, metadata?: { firstName?: string; lastName?: string }) => {
    console.log('🔐 AuthProvider: signUp called for:', email);
    console.log('  Metadata:', metadata);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata?.firstName || '',
          last_name: metadata?.lastName || '',
          full_name: metadata ? `${metadata.firstName} ${metadata.lastName}`.trim() : '',
        }
      }
    });
    
    if (error) {
      console.error('❌ AuthProvider: signUp error:', error);
      throw error;
    }
    
    console.log('✅ AuthProvider: signUp successful:', !!data.user);
    
    if (data.user && !data.session) {
      console.log('📧 AuthProvider: User created but needs email confirmation');
    }
  };

  const signOut = async () => {
    console.log('🔐 AuthProvider: signOut called');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ AuthProvider: signOut error:', error);
      throw error;
    }
    
    console.log('✅ AuthProvider: signOut successful');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}