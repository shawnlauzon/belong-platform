import { logger } from '../utils';
import {
  isAuthSignInSuccessEvent,
  isAuthSignInFailedEvent,
  isAuthSignUpSuccessEvent,
  isAuthSignUpFailedEvent,
  isAuthSignOutSuccessEvent,
  isAuthSignOutFailedEvent,
  type AppEvent,
} from '../types/events';
import { eventBus } from '../eventBus/eventBus';
import { toDomainUser } from '../transformers/userTransformer';
import type { Session } from '@supabase/supabase-js';

// Initialize authentication event listeners
export default function initializeAuthListeners(
  setAuthSession: (user: any, session: Session | null) => void,
  clearAuthSession: () => void,
  setAuthError: (error: string) => void,
  setAuthLoading: (loading: boolean) => void
) {
  logger.info('🔐 Store: Initializing authentication event listeners');

  // Handle successful sign in
  eventBus.on('auth.signIn.success', (event: AppEvent) => {
    if (!isAuthSignInSuccessEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signIn.success event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Handling successful sign in', {
      userId: event.data.user?.id,
    });
    setAuthLoading(false);

    if (event.data.user) {
      // Convert Supabase user to our AuthUser type using the transformer
      const userRow = {
        id: event.data.user.id,
        email: event.data.user.email || '',
        first_name: event.data.user.user_metadata?.first_name || '',
        last_name: event.data.user.user_metadata?.last_name || '',
        avatar_url: event.data.user.user_metadata?.avatar_url || null,
        user_metadata: {
          ...event.data.user.user_metadata,
          full_name: event.data.user.user_metadata?.full_name,
          location: event.data.user.user_metadata?.location,
          address: event.data.user.user_metadata?.address,
        },
        created_at: event.data.user.created_at || new Date().toISOString(),
        updated_at: event.data.user.updated_at || new Date().toISOString(),
      };
      const authUser = toDomainUser(userRow);
      setAuthSession(authUser, null); // Session will be handled separately if needed
    } else {
      logger.warn(
        '🔐 Store: Sign in success event received but no user data provided'
      );
      setAuthError('Authentication succeeded but no user data received');
    }
  });

  // Handle failed sign in
  eventBus.on('auth.signIn.failed', (event: AppEvent) => {
    if (!isAuthSignInFailedEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signIn.failed event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Handling failed sign in', {
      error: event.data.error,
    });
    setAuthLoading(false);
    setAuthError(event.data.error);
    clearAuthSession();
  });

  // Handle successful sign up
  eventBus.on('auth.signUp.success', (event: AppEvent) => {
    if (!isAuthSignUpSuccessEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signUp.success event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Handling successful sign up', {
      userId: event.data.user?.id,
    });
    setAuthLoading(false);

    if (event.data.user) {
      // Convert Supabase user to our AuthUser type using the transformer
      const userRow = {
        id: event.data.user.id,
        email: event.data.user.email || '',
        first_name: event.data.user.user_metadata?.first_name || '',
        last_name: event.data.user.user_metadata?.last_name || '',
        avatar_url: event.data.user.user_metadata?.avatar_url || null,
        user_metadata: {
          ...event.data.user.user_metadata,
          full_name: event.data.user.user_metadata?.full_name,
          location: event.data.user.user_metadata?.location,
          address: event.data.user.user_metadata?.address,
        },
        created_at: event.data.user.created_at || new Date().toISOString(),
        updated_at: event.data.user.updated_at || new Date().toISOString(),
      };
      const authUser = toDomainUser(userRow);
      setAuthSession(authUser, null);
    } else {
      logger.warn(
        '🔐 Store: Sign up success event received but no user data provided'
      );
      setAuthError('Registration succeeded but no user data received');
    }
  });

  // Handle failed sign up
  eventBus.on('auth.signUp.failed', (event: AppEvent) => {
    if (!isAuthSignUpFailedEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signUp.failed event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Handling failed sign up', {
      error: event.data.error,
    });
    setAuthLoading(false);
    setAuthError(event.data.error);
    clearAuthSession();
  });

  // Handle successful sign out
  eventBus.on('auth.signOut.success', (event: AppEvent) => {
    if (!isAuthSignOutSuccessEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signOut.success event', {
        event,
      });
      return;
    }

    logger.info('🔐 Store: Handling successful sign out', {
      userId: event.data.userId,
      sessionId: event.data.sessionId,
      timestamp: event.data.timestamp,
    });

    // Clear authentication state
    setAuthLoading(false);
    clearAuthSession();

    // Log successful sign out for analytics/security monitoring
    logger.info('📊 Analytics: User signed out successfully', {
      userId: event.data.userId,
      sessionId: event.data.sessionId,
      timestamp: event.data.timestamp,
      duration: event.data.timestamp - (event.timestamp || 0),
    });

    // Show success notification
    eventBus.emit('notification.show', {
      type: 'success',
      title: 'Signed Out',
      message: 'You have been successfully signed out.',
      duration: 3000,
    });

    // Redirect to home/login page
    eventBus.emit('navigation.redirect', {
      path: '/',
      replace: true,
    });
  });

  // Handle failed sign out
  eventBus.on('auth.signOut.failed', (event: AppEvent) => {
    if (!isAuthSignOutFailedEvent(event)) {
      logger.error('🔐 Store: Received invalid auth.signOut.failed event', {
        event,
      });
      return;
    }

    logger.error('🔐 Store: Handling failed sign out', {
      error: event.data.error,
      errorCode: event.data.errorCode,
      userId: event.data.userId,
      retryable: event.data.retryable,
      details: event.data.details,
    });

    setAuthLoading(false);

    // Log the error details for debugging and security monitoring
    logger.error('🚨 Security: Sign out failed', {
      error: event.data.error,
      errorCode: event.data.errorCode,
      userId: event.data.userId,
      retryable: event.data.retryable,
      details: event.data.details,
      timestamp: event.timestamp,
    });

    // Determine appropriate error message based on error type
    let userMessage = 'Failed to sign out. Please try again.';
    let showRetry = event.data.retryable;

    if (event.data.details?.sessionExpired) {
      userMessage =
        'Your session has expired. You have been automatically signed out.';
      showRetry = false;
      // Force clear session if it's expired
      clearAuthSession();

      // Redirect to login page
      eventBus.emit('navigation.redirect', {
        path: '/',
        replace: true,
      });
    } else if (event.data.details?.networkError) {
      userMessage =
        'Network error occurred during sign out. Please check your connection and try again.';
    } else if (event.data.details?.serverError) {
      userMessage =
        'Server error occurred during sign out. Please try again in a moment.';
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
      duration: showRetry ? 0 : 5000, // Persistent if retryable, auto-dismiss if not
    };

    // Add retry action if the error is retryable
    if (showRetry) {
      notificationData.action = {
        label: 'Retry',
        callback: () => {
          logger.info('🔄 User retrying sign out');
          eventBus.emit('auth.signOut.requested', void 0);
        },
      };
    }

    eventBus.emit('notification.show', notificationData);

    // For critical security scenarios, force local session cleanup
    if (
      event.data.errorCode === 'FORCE_LOGOUT' ||
      event.data.details?.sessionExpired
    ) {
      logger.warn(
        '🚨 Security: Forcing local session cleanup due to critical error'
      );
      clearAuthSession();

      eventBus.emit('navigation.redirect', {
        path: '/',
        replace: true,
      });
    }
  });

  // Handle sign in/up/out requests to set loading state
  eventBus.on('auth.signIn.requested', (event: AppEvent) => {
    if (event.type !== 'auth.signIn.requested') {
      logger.error('🔐 Store: Received invalid auth.signIn.requested event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Sign in requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  eventBus.on('auth.signUp.requested', (event: AppEvent) => {
    if (event.type !== 'auth.signUp.requested') {
      logger.error('🔐 Store: Received invalid auth.signUp.requested event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Sign up requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  eventBus.on('auth.signOut.requested', (event: AppEvent) => {
    if (event.type !== 'auth.signOut.requested') {
      logger.error('🔐 Store: Received invalid auth.signOut.requested event', {
        event,
      });
      return;
    }

    logger.debug('🔐 Store: Sign out requested, setting loading state');
    setAuthLoading(true);
    setAuthError(''); // Clear previous errors
  });

  logger.info('✅ Store: Authentication event listeners initialized');
}