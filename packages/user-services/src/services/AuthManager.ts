import { supabase } from '@belongnetwork/core';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core';
import type { User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  error?: string;
}

export class AuthManager {
  /**
   * Sign in with email and password
   */
  static async signInWithPassword(
    email: string,
    password: string
  ): Promise<AuthResult> {
    logger.info('🔐 AuthManager: Attempting sign in', { email });
    logApiCall('POST', 'auth/signin', { email });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('❌ AuthManager: Sign in failed', {
          email,
          error: error.message,
        });
        logApiResponse('POST', 'auth/signin', null, error);
        return { user: null, error: error.message };
      }

      if (!data.user) {
        const errorMsg = 'No user data returned from sign in';
        logger.error('❌ AuthManager: Sign in failed', {
          email,
          error: errorMsg,
        });
        logApiResponse('POST', 'auth/signin', null, { message: errorMsg });
        return { user: null, error: errorMsg };
      }

      logger.info('✅ AuthManager: Sign in successful', {
        email,
        userId: data.user.id,
      });
      logApiResponse('POST', 'auth/signin', { userId: data.user.id });

      return { user: data.user };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error during sign in';
      logger.error('❌ AuthManager: Sign in exception', {
        email,
        error: errorMsg,
      });
      logApiResponse('POST', 'auth/signin', null, error);
      return { user: null, error: errorMsg };
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUpWithPassword(
    email: string,
    password: string,
    metadata?: { firstName?: string; lastName?: string }
  ): Promise<AuthResult> {
    logger.info('🔐 AuthManager: Attempting sign up', {
      email,
      hasMetadata: !!metadata,
    });
    logApiCall('POST', 'auth/signup', { email, metadata });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
            ? {
                first_name: metadata.firstName,
                last_name: metadata.lastName,
                full_name:
                  metadata.firstName && metadata.lastName
                    ? `${metadata.firstName} ${metadata.lastName}`
                    : metadata.firstName || metadata.lastName || '',
              }
            : undefined,
        },
      });

      if (error) {
        logger.error('❌ AuthManager: Sign up failed', {
          email,
          error: error.message,
        });
        logApiResponse('POST', 'auth/signup', null, error);
        return { user: null, error: error.message };
      }

      if (!data.user) {
        const errorMsg = 'No user data returned from sign up';
        logger.error('❌ AuthManager: Sign up failed', {
          email,
          error: errorMsg,
        });
        logApiResponse('POST', 'auth/signup', null, { message: errorMsg });
        return { user: null, error: errorMsg };
      }

      logger.info('✅ AuthManager: Sign up successful', {
        email,
        userId: data.user.id,
        needsConfirmation: !data.user.email_confirmed_at,
      });
      logApiResponse('POST', 'auth/signup', {
        userId: data.user.id,
        needsConfirmation: !data.user.email_confirmed_at,
      });

      return { user: data.user };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error during sign up';
      logger.error('❌ AuthManager: Sign up exception', {
        email,
        error: errorMsg,
      });
      logApiResponse('POST', 'auth/signup', null, error);
      return { user: null, error: errorMsg };
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<{ error?: string }> {
    logger.info('🔐 AuthManager: Attempting sign out');
    logApiCall('POST', 'auth/signout');

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.error('❌ AuthManager: Sign out failed', {
          error: error.message,
        });
        logApiResponse('POST', 'auth/signout', null, error);
        return { error: error.message };
      }

      logger.info('✅ AuthManager: Sign out successful');
      logApiResponse('POST', 'auth/signout', { success: true });

      return {};
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Unknown error during sign out';
      logger.error('❌ AuthManager: Sign out exception', { error: errorMsg });
      logApiResponse('POST', 'auth/signout', null, error);
      return { error: errorMsg };
    }
  }

  /**
   * Get the current user session
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        logger.error('❌ AuthManager: Failed to get current user', {
          error: error.message,
        });
        return null;
      }

      return user;
    } catch (error) {
      logger.error('❌ AuthManager: Exception getting current user', { error });
      return null;
    }
  }

  /**
   * Get the current session
   */
  static async getCurrentSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error('❌ AuthManager: Failed to get current session', {
          error: error.message,
        });
        return null;
      }

      return session;
    } catch (error) {
      logger.error('❌ AuthManager: Exception getting current session', {
        error,
      });
      return null;
    }
  }
}
