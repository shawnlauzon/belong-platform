import { eventBus } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { AuthManager } from '../services/AuthManager';
import type {
  AuthSignInRequestedEvent,
  AuthSignUpRequestedEvent,
  AuthSignOutRequestedEvent,
} from '@belongnetwork/core';

/**
 * Initialize authentication event handlers
 */
export function initializeAuthEventHandlers() {
  logger.info('🔐 UserServices: Initializing authentication event handlers');

  // Handle sign in requests
  eventBus.on(
    'auth.signIn.requested',
    async (event: AuthSignInRequestedEvent) => {
      logger.debug('🔐 UserServices: Handling sign in request', {
        email: event.data.email,
      });

      try {
        const result = await AuthManager.signInWithPassword(
          event.data.email,
          event.data.password
        );

        if (result.error) {
          eventBus.emit('auth.signIn.failed', {
            error: result.error,
          });
        } else {
          eventBus.emit('auth.signIn.success', {
            user: result.user,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during sign in';
        logger.error('❌ UserServices: Sign in handler exception', {
          error: errorMessage,
        });

        eventBus.emit('auth.signIn.failed', {
          error: errorMessage,
        });
      }
    }
  );

  // Handle sign up requests
  eventBus.on(
    'auth.signUp.requested',
    async (event: AuthSignUpRequestedEvent) => {
      logger.debug('🔐 UserServices: Handling sign up request', {
        email: event.data.email,
        hasMetadata: !!event.data.metadata,
      });

      try {
        const result = await AuthManager.signUpWithPassword(
          event.data.email,
          event.data.password,
          event.data.metadata
        );

        if (result.error) {
          eventBus.emit('auth.signUp.failed', {
            error: result.error,
          });
        } else {
          eventBus.emit('auth.signUp.success', {
            user: result.user,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during sign up';
        logger.error('❌ UserServices: Sign up handler exception', {
          error: errorMessage,
        });

        eventBus.emit('auth.signUp.failed', {
          error: errorMessage,
        });
      }
    }
  );

  // Handle sign out requests
  eventBus.on(
    'auth.signOut.requested',
    async (event: AuthSignOutRequestedEvent) => {
      logger.debug('🔐 UserServices: Handling sign out request');

      try {
        const result = await AuthManager.signOut();

        if (result.error) {
          eventBus.emit('auth.signOut.failed', {
            error: result.error,
          });
        } else {
          eventBus.emit('auth.signOut.success', {
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Unknown error during sign out';
        logger.error('❌ UserServices: Sign out handler exception', {
          error: errorMessage,
        });

        eventBus.emit('auth.signOut.failed', {
          error: errorMessage,
        });
      }
    }
  );

  logger.info('✅ UserServices: Authentication event handlers initialized');
}

/**
 * Initialize all user-related event handlers
 */
export function initializeUserEventHandlers() {
  logger.info('👥 UserServices: Initializing all user event handlers');

  // Initialize authentication handlers
  initializeAuthEventHandlers();

  // TODO: Add other user-related event handlers here
  // - Profile update handlers
  // - Location update handlers
  // - etc.

  logger.info('✅ UserServices: All user event handlers initialized');
}
