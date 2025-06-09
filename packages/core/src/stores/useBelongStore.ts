import { create } from 'zustand';
import { eventBus } from '../eventBus/eventBus';
import { initialState } from './initialState';
import { logger } from '../utils/logger';
import type { BelongState, BelongStore } from './types';
import type { Session } from '@supabase/supabase-js';
import type { AppEvent } from '../types/events';

// Type guard functions for event type checking
function isAuthSignInSuccessEvent(event: AppEvent): event is import('../types/events').AuthSignInSuccessEvent {
  return event.type === 'auth.signIn.success';
}

function isAuthSignInFailedEvent(event: AppEvent): event is import('../types/events').AuthSignInFailedEvent {
  return event.type === 'auth.signIn.failed';
}

function isAuthSignUpSuccessEvent(event: AppEvent): event is import('../types/events').AuthSignUpSuccessEvent {
  return event.type === 'auth.signUp.success';
}

function isAuthSignUpFailedEvent(event: AppEvent): event is import('../types/events').AuthSignUpFailedEvent {
  return event.type === 'auth.signUp.failed';
}

function isAuthSignOutFailedEvent(event: AppEvent): event is import('../types/events').AuthSignOutRequestedEvent {
  return event.type === 'auth.signOut.failed';
}

// Initialize authentication event listeners
function initializeAuthListeners(
  setAuthSession: (user: any, session: Session | null) => void,
  clearAuthSession: () => void,
  setAuthError: (error: string) => void,
  setAuthLoading: (loading: boolean) => void
) {
  logger.info('🔐 Store: Initializing authentication event listeners');

  // Handle successful sign in
  eventBus.on('auth.signIn.success', (event: AppEvent) => {
    if (!isAuthSignInSuccessEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signIn.success event', { event });
      return;
    }

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
    } else {
      logger.warn('🔐 Store: Sign in success event received but no user data provided');
      setAuthError('Authentication succeeded but no user data received');
    }
  });

  // Handle failed sign in
  eventBus.on('auth.signIn.failed', (event: AppEvent) => {
    if (!isAuthSignInFailedEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signIn.failed event', { event });
      return;
    }

    logger.debug('🔐 Store: Handling failed sign in', { error: event.data.error });
    setAuthLoading(false);
    setAuthError(event.data.error);
    clearAuthSession();
  });

  // Handle successful sign up
  eventBus.on('auth.signUp.success', (event: AppEvent) => {
    if (!isAuthSignUpSuccessEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signUp.success event', { event });
      return;
    }

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
    } else {
      logger.warn('🔐 Store: Sign up success event received but no user data provided');
      setAuthError('Registration succeeded but no user data received');
    }
  });

  // Handle failed sign up
  eventBus.on('auth.signUp.failed', (event: AppEvent) => {
    if (!isAuthSignUpFailedEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signUp.failed event', { event });
      return;
    }

    logger.debug('🔐 Store: Handling failed sign up', { error: event.data.error });
    setAuthLoading(false);
    setAuthError(event.data.error);
    clearAuthSession();
  });

  // Handle successful sign out
  eventBus.on('auth.signOut.success', (event: AppEvent) => {
    // Sign out success events don't have specific data, just verify the type
    if (event.type !== 'auth.signOut.success') {
      logger.error('🔐 Store: Received invalid auth.signOut.success event', { event });
      return;
    }

    logger.debug('🔐 Store: Handling successful sign out');
    setAuthLoading(false);
    clearAuthSession();
  });

  // Handle failed sign out
  eventBus.on('auth.signOut.failed', (event: AppEvent) => {
    // For sign out failed, we need to check if it has error data
    if (event.type !== 'auth.signOut.failed') {
      logger.error('🔐 Store: Received invalid auth.signOut.failed event', { event });
      return;
    }

    const errorMessage = (event.data as any)?.error || 'Sign out failed';
    logger.debug('🔐 Store: Handling failed sign out', { error: errorMessage });
    setAuthLoading(false);
    setAuthError(errorMessage);
  });

  // Handle sign in/up/out requests to set loading state
  eventBus.on('auth.signIn.requested', (event: AppEvent) => {
    if (event.type !== 'auth.signIn.requested') {
      logger.error('🔐 Store: Received invalid auth.signIn.requested event', { event });
      return;
    }

    logger.debug('🔐 Store: Sign in requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  eventBus.on('auth.signUp.requested', (event: AppEvent) => {
    if (event.type !== 'auth.signUp.requested') {
      logger.error('🔐 Store: Received invalid auth.signUp.requested event', { event });
      return;
    }

    logger.debug('🔐 Store: Sign up requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  eventBus.on('auth.signOut.requested', (event: AppEvent) => {
    if (event.type !== 'auth.signOut.requested') {
      logger.error('🔐 Store: Received invalid auth.signOut.requested event', { event });
      return;
    }

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