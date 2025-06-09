import { create } from 'zustand';
import { eventBus } from '../eventBus/eventBus';
import { initialState } from './initialState';
import { logger } from '../utils/logger';
import type { BelongState, BelongStore } from './types';
import type { Session } from '@supabase/supabase-js';
import type {
  AuthSignInSuccessEvent,
  AuthSignInFailedEvent,
  AuthSignUpSuccessEvent,
  AuthSignUpFailedEvent,
} from '../types/events';

// Initialize authentication event listeners
function initializeAuthListeners(
  setAuthSession: (user: any, session: Session | null) => void,
  clearAuthSession: () => void,
  setAuthError: (error: string) => void,
  setAuthLoading: (loading: boolean) => void
) {
  logger.info('🔐 Store: Initializing authentication event listeners');

  // Handle successful sign in
  eventBus.on('auth.signIn.success', (event: AuthSignInSuccessEvent) => {
    logger.debug('🔐 Store: Handling successful sign in', { userId: event.data.user?.id });
    setAuthLoading(false);
    if (event.data.user) {
      // Convert Supabase user to our Me type
      const meUser = {
        id: event.data.user.id,
        email: event.data.user.email || '',
        first_name: event.data.user.user_metadata?.first_name || '',
        last_name: event.data.user.user_metadata?.last_name || '',
        avatar_url: event.data.user.user_metadata?.avatar_url,
      };
      setAuthSession(meUser, null); // Session will be handled separately if needed
    }
  });

  // Handle failed sign in
  eventBus.on('auth.signIn.failed', (event: AuthSignInFailedEvent) => {
    logger.debug('🔐 Store: Handling failed sign in', { error: event.data.error });
    setAuthLoading(false);
    setAuthError(event.data.error);
    clearAuthSession();
  });

  // Handle successful sign up
  eventBus.on('auth.signUp.success', (event: AuthSignUpSuccessEvent) => {
    logger.debug('🔐 Store: Handling successful sign up', { userId: event.data.user?.id });
    setAuthLoading(false);
    if (event.data.user) {
      // Convert Supabase user to our Me type
      const meUser = {
        id: event.data.user.id,
        email: event.data.user.email || '',
        first_name: event.data.user.user_metadata?.first_name || '',
        last_name: event.data.user.user_metadata?.last_name || '',
        avatar_url: event.data.user.user_metadata?.avatar_url,
      };
      setAuthSession(meUser, null);
    }
  });

  // Handle failed sign up
  eventBus.on('auth.signUp.failed', (event: AuthSignUpFailedEvent) => {
    logger.debug('🔐 Store: Handling failed sign up', { error: event.data.error });
    setAuthLoading(false);
    setAuthError(event.data.error);
    clearAuthSession();
  });

  // Handle successful sign out
  eventBus.on('auth.signOut.success', () => {
    logger.debug('🔐 Store: Handling successful sign out');
    setAuthLoading(false);
    clearAuthSession();
  });

  // Handle failed sign out
  eventBus.on('auth.signOut.failed', (event: any) => {
    logger.debug('🔐 Store: Handling failed sign out', { error: event.data?.error });
    setAuthLoading(false);
    setAuthError(event.data?.error || 'Sign out failed');
  });

  // Handle sign in/up/out requests to set loading state
  eventBus.on('auth.signIn.requested', () => {
    logger.debug('🔐 Store: Sign in requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  eventBus.on('auth.signUp.requested', () => {
    logger.debug('🔐 Store: Sign up requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  eventBus.on('auth.signOut.requested', () => {
    logger.debug('🔐 Store: Sign out requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  logger.info('✅ Store: Authentication event listeners initialized');
}

// Create the store with state and actions
export const useBelongStore = create<BelongStore>((set, get) => {
  // Define internal state management functions
  const setAuthSession = (user: any, session: Session | null) => {
    set((state) => ({
      ...state,
      auth: {
        ...state.auth,
        user,
        session,
        isAuthenticated: true,
        token: session?.access_token || null,
        error: null,
        isLoading: false,
      },
    }));
  };

  const clearAuthSession = () => {
    set((state) => ({
      ...state,
      auth: {
        ...state.auth,
        user: null,
        session: null,
        isAuthenticated: false,
        token: null,
        isLoading: false,
      },
    }));
  };

  const setAuthError = (error: string) => {
    set((state) => ({
      ...state,
      auth: {
        ...state.auth,
        error,
        isLoading: false,
      },
    }));
  };

  const setAuthLoading = (loading: boolean) => {
    set((state) => ({
      ...state,
      auth: {
        ...state.auth,
        isLoading: loading,
      },
    }));
  };

  // Initialize event listeners
  initializeAuthListeners(setAuthSession, clearAuthSession, setAuthError, setAuthLoading);

  return {
    // Spread the initial state
    ...initialState,

    // Actions that only emit events
    setActiveCommunity: (communityId: string) => {
      eventBus.emit('community.active.change.requested', { communityId });
    },

    signIn: (email: string, password: string) => {
      eventBus.emit('auth.signIn.requested', { email, password });
    },

    signUp: (
      email: string,
      password: string,
      metadata?: { firstName?: string; lastName?: string }
    ) => {
      eventBus.emit('auth.signUp.requested', { email, password, metadata });
    },

    signOut: () => {
      eventBus.emit('auth.signOut.requested', void 0);
    },

    // Internal auth state management actions
    setAuthSession,
    clearAuthSession,
    setAuthError,
    setAuthLoading,

    // Selectors and state updaters
    getActiveCommunity: () => {
      const state = get();
      if (!state.communities.activeId) return null;
      return (
        state.communities.list.find(
          (community) => community.id === state.communities.activeId
        ) || null
      );
    },

    setViewMode: (mode: 'member' | 'organizer') => {
      set((state) => ({
        ...state,
        app: {
          ...state.app,
          viewMode: mode,
        },
      }));
    },
  };
});