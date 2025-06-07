import { eventBus } from '@/core/eventBus';
import { supabase } from '@/lib/supabase';
import { logger, logApiCall, logApiResponse, logUserAction } from '@/lib/logger';

export class AuthManager {
  static initialize() {
    logger.info('🔐 AuthManager: Initializing...');

    // Listen for sign in requests
    eventBus.on('auth.signIn.requested', async (event) => {
      if (event.type !== 'auth.signIn.requested') return;

      const { email, password } = event.data;
      logger.debug('🔐 AuthManager: Sign in requested:', { email });
      
      try {
        logUserAction('signIn', { email });
        logApiCall('POST', '/auth/signin', { email });
        
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          logApiResponse('POST', '/auth/signin', null, error);
          throw error;
        }
        
        logApiResponse('POST', '/auth/signin', { hasUser: !!data.user });
        logger.info('✅ AuthManager: Sign in successful');
        
        eventBus.emit('auth.signIn.success', { user: data.user });
      } catch (error) {
        logger.error('❌ AuthManager: Sign in failed:', error);
        
        let errorMessage = 'Authentication failed. Please try again.';
        
        if (error && typeof error === 'object' && (error as any).message) {
          const message = (error as any).message;
          if (message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials.';
          } else if (message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and click the confirmation link.';
          }
        }
        
        eventBus.emit('auth.signIn.failed', { error: errorMessage });
      }
    });

    // Listen for sign up requests
    eventBus.on('auth.signUp.requested', async (event) => {
      if (event.type !== 'auth.signUp.requested') return;

      const { email, password, metadata } = event.data;
      logger.debug('🔐 AuthManager: Sign up requested:', { email, hasMetadata: !!metadata });
      
      try {
        logUserAction('signUp', { email, hasMetadata: !!metadata });
        logApiCall('POST', '/auth/signup', { email, metadata });
        
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
          logApiResponse('POST', '/auth/signup', null, error);
          throw error;
        }
        
        logApiResponse('POST', '/auth/signup', { hasUser: !!data.user, needsConfirmation: !data.session });
        
        if (data.user && !data.session) {
          logger.info('📧 AuthManager: User created but needs email confirmation');
        }
        
        eventBus.emit('auth.signUp.success', { user: data.user });
      } catch (error) {
        logger.error('❌ AuthManager: Sign up failed:', error);
        
        let errorMessage = 'Account creation failed. Please try again.';
        
        if (error && typeof error === 'object' && (error as any).message) {
          const message = (error as any).message;
          if (message.includes('User already registered')) {
            errorMessage = 'An account with this email already exists. Try signing in instead.';
          }
        }
        
        eventBus.emit('auth.signUp.failed', { error: errorMessage });
      }
    });

    logger.info('✅ AuthManager: Initialized');
  }
}