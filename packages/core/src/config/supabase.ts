import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';
import { logger as defaultLogger } from '../utils/logger';

/**
 * Creates a configured Supabase client instance
 * @param supabaseUrl - Supabase project URL
 * @param supabaseAnonKey - Supabase anonymous key
 * @param logger - Logger instance (optional, uses default if not provided)
 * @returns Configured Supabase client
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  logger = defaultLogger
): SupabaseClient<Database> {
  // Debug logging for configuration
  logger.debug('🔧 Supabase Client Debug Info:', {
    url: supabaseUrl,
    anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...',
    urlIsValid:
      supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co'),
    anonKeyIsValid:
      supabaseAnonKey.startsWith('eyJ') && supabaseAnonKey.length > 100,
  });

  // Validate configuration
  if (!supabaseUrl) {
    throw new Error('Supabase URL is required');
  }

  if (!supabaseAnonKey) {
    throw new Error('Supabase anonymous key is required');
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  // Test the client connection
  client.auth
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

  return client;
}

// Legacy singleton instance for backward compatibility
// Use environment variables or fallback to local development values
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://example.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Validate environment variables for legacy usage
if (!supabaseUrl || supabaseUrl === 'https://example.supabase.co') {
  defaultLogger.error(
    '❌ VITE_SUPABASE_URL is not set or is using the default placeholder value'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
  defaultLogger.error(
    '❌ VITE_SUPABASE_ANON_KEY is not set or is using the default placeholder value'
  );
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, defaultLogger);