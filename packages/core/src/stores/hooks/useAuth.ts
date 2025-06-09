import { useBelongStore } from '../useBelongStore';
import { eventBus } from '../../eventBus/eventBus';
import type { Me } from '../../types/entities';
import type { Session } from '@supabase/supabase-js';

/**
 * Authentication hook that manages user authentication state and actions
 * 
 * @returns Authentication state and actions
 * 
 * @example
 * ```tsx
 * const { user, isAuthenticated, signIn, signOut, isLoading, error } = useAuth();
 * 
 * const handleLogin = async () => {
 *   await signIn('user@example.com', 'password');
 * };
 * ```
 */
export function useAuth() {
  // Select only auth-related state
  const authState = useBelongStore((state) => state.auth);
  
  // Auth actions that emit events
  const signIn = (email: string, password: string) => {
    eventBus.emit('auth.signIn.requested', { email, password });
  };

  const signUp = (
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ) => {
    eventBus.emit('auth.signUp.requested', { email, password, metadata });
  };

  const signOut = () => {
    eventBus.emit('auth.signOut.requested', void 0);
  };

  return {
    // State
    user: authState.user,
    session: authState.session,
    location: authState.location,
    isAuthenticated: authState.isAuthenticated,
    token: authState.token,
    isLoading: authState.isLoading,
    error: authState.error,
    
    // Actions
    signIn,
    signUp,
    signOut,
  };
}

/**
 * Hook for components that need to manage auth state internally
 * (Used by auth services, not UI components)
 */
export function useAuthActions() {
  const setAuthSession = useBelongStore((state) => state.setAuthSession);
  const clearAuthSession = useBelongStore((state) => state.clearAuthSession);
  const setAuthError = useBelongStore((state) => state.setAuthError);
  const setAuthLoading = useBelongStore((state) => state.setAuthLoading);

  return {
    setAuthSession,
    clearAuthSession,
    setAuthError,
    setAuthLoading,
  };
}

/**
 * Selector hook for auth status only (optimized for components that only need to know if user is logged in)
 */
export function useAuthStatus() {
  return useBelongStore((state) => ({
    isAuthenticated: state.auth.isAuthenticated,
    isLoading: state.auth.isLoading,
    hasError: !!state.auth.error,
  }));
}

/**
 * Selector hook for current user info only
 */
export function useCurrentUser(): Me | null {
  return useBelongStore((state) => state.auth.user);
}