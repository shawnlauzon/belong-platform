import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { eventBus } from '../eventBus/eventBus';
import { initialState } from './initialState';
import { logger } from '../utils/logger';
import type { BelongState, BelongStore } from './types';
import type { Session } from '@supabase/supabase-js';
import type { AppEvent } from '../types/events';
import type { Resource } from '../types/entities';

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

function isAuthSignOutSuccessEvent(event: AppEvent): event is import('../types/events').AuthSignOutSuccessEvent {
  return event.type === 'auth.signOut.success';
}

function isAuthSignOutFailedEvent(event: AppEvent): event is import('../types/events').AuthSignOutFailedEvent {
  return event.type === 'auth.signOut.failed';
}

// Resource event type guards
function isResourceFetchSuccessEvent(event: AppEvent): event is import('../types/events').ResourceFetchSuccessEvent {
  return event.type === 'resource.fetch.success';
}

function isResourceFetchFailedEvent(event: AppEvent): event is import('../types/events').ResourceFetchFailedEvent {
  return event.type === 'resource.fetch.failed';
}

function isResourceCreatedEvent(event: AppEvent): event is import('../types/events').ResourceCreatedEvent {
  return event.type === 'resource.created';
}

function isResourceCreateFailedEvent(event: AppEvent): event is import('../types/events').ResourceCreateFailedEvent {
  return event.type === 'resource.create.failed';
}

function isResourceUpdatedEvent(event: AppEvent): event is import('../types/events').ResourceUpdatedEvent {
  return event.type === 'resource.updated';
}

function isResourceUpdateFailedEvent(event: AppEvent): event is import('../types/events').ResourceUpdateFailedEvent {
  return event.type === 'resource.update.failed';
}

function isResourceDeletedEvent(event: AppEvent): event is import('../types/events').ResourceDeletedEvent {
  return event.type === 'resource.deleted';
}

function isResourceDeleteFailedEvent(event: AppEvent): event is import('../types/events').ResourceDeleteFailedEvent {
  return event.type === 'resource.delete.failed';
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
    if (!isAuthSignOutSuccessEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signOut.success event', { event });
      return;
    }

    logger.info('🔐 Store: Handling successful sign out', { 
      userId: event.data.userId,
      sessionId: event.data.sessionId,
      timestamp: event.data.timestamp 
    });

    // Clear authentication state
    setAuthLoading(false);
    clearAuthSession();

    // Log successful sign out for analytics/security monitoring
    logger.info('📊 Analytics: User signed out successfully', {
      userId: event.data.userId,
      sessionId: event.data.sessionId,
      timestamp: event.data.timestamp,
      duration: event.data.timestamp - (event.timestamp || 0)
    });

    // Show success notification
    eventBus.emit('notification.show', {
      type: 'success',
      title: 'Signed Out',
      message: 'You have been successfully signed out.',
      duration: 3000
    });

    // Redirect to home/login page
    eventBus.emit('navigation.redirect', {
      path: '/',
      replace: true
    });
  });

  // Handle failed sign out
  eventBus.on('auth.signOut.failed', (event: AppEvent) => {
    if (!isAuthSignOutFailedEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signOut.failed event', { event });
      return;
    }

    logger.error('🔐 Store: Handling failed sign out', { 
      error: event.data.error,
      errorCode: event.data.errorCode,
      userId: event.data.userId,
      retryable: event.data.retryable,
      details: event.data.details
    });

    setAuthLoading(false);

    // Log the error details for debugging and security monitoring
    logger.error('🚨 Security: Sign out failed', {
      error: event.data.error,
      errorCode: event.data.errorCode,
      userId: event.data.userId,
      retryable: event.data.retryable,
      details: event.data.details,
      timestamp: event.timestamp
    });

    // Determine appropriate error message based on error type
    let userMessage = 'Failed to sign out. Please try again.';
    let showRetry = event.data.retryable;

    if (event.data.details?.sessionExpired) {
      userMessage = 'Your session has expired. You have been automatically signed out.';
      showRetry = false;
      // Force clear session if it's expired
      clearAuthSession();
      
      // Redirect to login page
      eventBus.emit('navigation.redirect', {
        path: '/',
        replace: true
      });
    } else if (event.data.details?.networkError) {
      userMessage = 'Network error occurred during sign out. Please check your connection and try again.';
    } else if (event.data.details?.serverError) {
      userMessage = 'Server error occurred during sign out. Please try again in a moment.';
    }

    // Set error state only if session is still valid
    if (!event.data.details?.sessionExpired) {
      setAuthError(event.data.error);
    }

    // Show error notification with optional retry
    const notificationData: any = {
      type: 'error' as const,
      title: 'Sign Out Failed',
      message: userMessage,
      duration: showRetry ? 0 : 5000 // Persistent if retryable, auto-dismiss if not
    };

    // Add retry action if the error is retryable
    if (showRetry) {
      notificationData.action = {
        label: 'Retry',
        callback: () => {
          logger.info('🔄 User retrying sign out');
          eventBus.emit('auth.signOut.requested', void 0);
        }
      };
    }

    eventBus.emit('notification.show', notificationData);

    // For critical security scenarios, force local session cleanup
    if (event.data.errorCode === 'FORCE_LOGOUT' || event.data.details?.sessionExpired) {
      logger.warn('🚨 Security: Forcing local session cleanup due to critical error');
      clearAuthSession();
      
      eventBus.emit('navigation.redirect', {
        path: '/',
        replace: true
      });
    }
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

// Initialize resource event listeners
function initializeResourceListeners(
  setResourcesLoading: (isLoading: boolean) => void,
  setResourcesError: (error: string | null) => void,
  setResources: (resources: Resource[]) => void,
  addResource: (resource: Resource) => void,
  updateResourceInList: (resource: Resource) => void,
  removeResource: (resourceId: string) => void
) {
  logger.info('📦 Store: Initializing resource event listeners');

  // Handle resource operation requests (set loading state)
  eventBus.on('resource.fetch.requested', (event: AppEvent) => {
    if (event.type !== 'resource.fetch.requested') {
      logger.error('📦 Store: Received invalid resource.fetch.requested event', { event });
      return;
    }

    logger.debug('📦 Store: Resource fetch requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  eventBus.on('resource.create.requested', (event: AppEvent) => {
    if (event.type !== 'resource.create.requested') {
      logger.error('📦 Store: Received invalid resource.create.requested event', { event });
      return;
    }

    logger.debug('📦 Store: Resource create requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  eventBus.on('resource.update.requested', (event: AppEvent) => {
    if (event.type !== 'resource.update.requested') {
      logger.error('📦 Store: Received invalid resource.update.requested event', { event });
      return;
    }

    logger.debug('📦 Store: Resource update requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  eventBus.on('resource.delete.requested', (event: AppEvent) => {
    if (event.type !== 'resource.delete.requested') {
      logger.error('📦 Store: Received invalid resource.delete.requested event', { event });
      return;
    }

    logger.debug('📦 Store: Resource delete requested, setting loading state');
    setResourcesLoading(true);
    setResourcesError(null);
  });

  // Handle successful resource operations
  eventBus.on('resource.fetch.success', (event: AppEvent) => {
    if (!isResourceFetchSuccessEvent(event)) {
      logger.error('📦 Store: Received invalid resource.fetch.success event', { event });
      return;
    }

    logger.debug('📦 Store: Received resource.fetch.success event, data:', event.data.resources);
    logger.debug('📦 Store: Handling successful resource fetch', { 
      count: event.data.resources.length 
    });
    setResources(event.data.resources);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  eventBus.on('resource.created', (event: AppEvent) => {
    if (!isResourceCreatedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.created event', { event });
      return;
    }

    logger.debug('📦 Store: Handling successful resource creation', { 
      resourceId: event.data.id,
      title: event.data.title 
    });
    addResource(event.data);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  eventBus.on('resource.updated', (event: AppEvent) => {
    if (!isResourceUpdatedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.updated event', { event });
      return;
    }

    logger.debug('📦 Store: Handling successful resource update', { 
      resourceId: event.data.id,
      title: event.data.title 
    });
    updateResourceInList(event.data);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  eventBus.on('resource.deleted', (event: AppEvent) => {
    if (!isResourceDeletedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.deleted event', { event });
      return;
    }

    logger.debug('📦 Store: Handling successful resource deletion', { 
      resourceId: event.data.resourceId 
    });
    removeResource(event.data.resourceId);
    setResourcesLoading(false);
    setResourcesError(null);
  });

  // Handle failed resource operations
  eventBus.on('resource.fetch.failed', (event: AppEvent) => {
    if (!isResourceFetchFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.fetch.failed event', { event });
      return;
    }

    logger.debug('📦 Store: Handling failed resource fetch', { error: event.data.error });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  eventBus.on('resource.create.failed', (event: AppEvent) => {
    if (!isResourceCreateFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.create.failed event', { event });
      return;
    }

    logger.debug('📦 Store: Handling failed resource creation', { error: event.data.error });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  eventBus.on('resource.update.failed', (event: AppEvent) => {
    if (!isResourceUpdateFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.update.failed event', { event });
      return;
    }

    logger.debug('📦 Store: Handling failed resource update', { error: event.data.error });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  eventBus.on('resource.delete.failed', (event: AppEvent) => {
    if (!isResourceDeleteFailedEvent(event)) {
      logger.error('📦 Store: Received invalid resource.delete.failed event', { event });
      return;
    }

    logger.debug('📦 Store: Handling failed resource deletion', { 
      resourceId: event.data.resourceId,
      error: event.data.error 
    });
    setResourcesLoading(false);
    setResourcesError(event.data.error);
  });

  logger.info('✅ Store: Resource event listeners initialized');
}

// Create the store with state and actions
export const useBelongStore = create<BelongStore>()(
  devtools(
    (set, get) => {
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
        }), false, 'auth/setSession');
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
        }), false, 'auth/clearSession');
      };

      const setAuthError = (error: string) => {
        set((state) => ({
          ...state,
          auth: {
            ...state.auth,
            error,
            isLoading: false,
          },
        }), false, 'auth/setError');
      };

      const setAuthLoading = (loading: boolean) => {
        set((state) => ({
          ...state,
          auth: {
            ...state.auth,
            isLoading: loading,
          },
        }), false, 'auth/setLoading');
      };

      // Define resource state management functions
      const setResourcesLoading = (isLoading: boolean) => {
        set((state) => ({
          ...state,
          resources: {
            ...state.resources,
            isLoading,
          },
        }), false, 'resources/setLoading');
      };

      const setResourcesError = (error: string | null) => {
        set((state) => ({
          ...state,
          resources: {
            ...state.resources,
            error,
          },
        }), false, 'resources/setError');
      };

      const setResources = (resources: Resource[]) => {
        logger.debug('📦 Store: Setting resources in store:', resources);
        set((state) => ({
          ...state,
          resources: {
            ...state.resources,
            list: resources,
          },
        }), false, 'resources/setList');
        logger.debug('📦 Store: Resources state updated to:', get().resources.list);
      };

      const addResource = (resource: Resource) => {
        set((state) => ({
          ...state,
          resources: {
            ...state.resources,
            list: [resource, ...state.resources.list],
          },
        }), false, 'resources/add');
      };

      const updateResourceInList = (updatedResource: Resource) => {
        set((state) => ({
          ...state,
          resources: {
            ...state.resources,
            list: state.resources.list.map((resource) =>
              resource.id === updatedResource.id ? updatedResource : resource
            ),
          },
        }), false, 'resources/update');
      };

      const removeResource = (resourceId: string) => {
        set((state) => ({
          ...state,
          resources: {
            ...state.resources,
            list: state.resources.list.filter((resource) => resource.id !== resourceId),
          },
        }), false, 'resources/remove');
      };

      // Initialize event listeners
      initializeAuthListeners(setAuthSession, clearAuthSession, setAuthError, setAuthLoading);
      initializeResourceListeners(
        setResourcesLoading,
        setResourcesError,
        setResources,
        addResource,
        updateResourceInList,
        removeResource
      );

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

        // Resource state management actions
        setResourcesLoading,
        setResourcesError,
        setResources,
        addResource,
        updateResourceInList,
        removeResource,

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
          }), false, 'app/setViewMode');
        },
      };
    },
    {
      name: 'belong-store', // Name that will appear in DevTools
      enabled: import.meta.env.DEV, // Only enable in development
    }
  )
);