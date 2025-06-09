import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Use environment variables or fallback to local development values
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Debug logging for environment variables
logger.debug('🔧 Supabase Client Debug Info:', {
  url: supabaseUrl,
  anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...',
  urlIsValid:
    supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co'),
  anonKeyIsValid:
    supabaseAnonKey.startsWith('eyJ') && supabaseAnonKey.length > 100,
});

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'https://example.supabase.co') {
  logger.error(
    '❌ VITE_SUPABASE_URL is not set or is using the default placeholder value'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  logger.error(
    '❌ VITE_SUPABASE_ANON_KEY is not set or is using the default placeholder value'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Test the client connection
supabase.auth
  .getSession()
  .then(({ data, error }) => {
    if (error) {
      logger.error('❌ Supabase client connection test failed:', error);
    } else {
      logger.info('✅ Supabase client initialized successfully', {
        hasSession: !!data.session,
      });
    }
  })
  .catch((error) => {
    logger.error('❌ Supabase client initialization error:', error);
  });