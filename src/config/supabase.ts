import {
  createClient,
  SupabaseClientOptions,
  type SupabaseClient,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

/**
 * Creates a configured Supabase client instance with type safety for the Belong Network database.
 *
 * This function creates a Supabase client with proper TypeScript types for the database schema,
 * authentication handling, and logging integration. The client is configured for the Belong
 * Network platform with all necessary type definitions.
 *
 * @param supabaseUrl - Your Supabase project URL (e.g., 'https://your-project.supabase.co')
 * @param supabaseAnonKey - Your Supabase anonymous/public key
 * @param options - Optional Supabase client options
 * @returns Configured Supabase client with Belong Network types
 *
 * @example
 * ```typescript
 * import { createSupabaseClient } from '@belongnetwork/core';
 *
 * const supabase = createSupabaseClient(
 *   'https://your-project.supabase.co',
 *   'your-anon-key'
 * );
 *
 * // Type-safe database queries
 * const { data: communities } = await supabase
 *   .from('communities')
 *   .select('*');
 *
 * // Authentication
 * const { data } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With custom logger
 * import { createLogger } from '@belongnetwork/core';
 *
 * const logger = createLogger('MyApp');
 * const supabase = createSupabaseClient(
 *   process.env.SUPABASE_URL,
 *   process.env.SUPABASE_ANON_KEY,
 *   logger
 * );
 * ```
 *
 * @category Client Functions
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<'public'>,
): SupabaseClient<Database> {
  // Debug logging for configuration
  logger.debug('🔧 Supabase Client Debug Info:', {
    url: supabaseUrl,
    anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...',
    urlIsValid:
      supabaseUrl.startsWith('https://') &&
      supabaseUrl.includes('.supabase.co'),
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

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, options);

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
