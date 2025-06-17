import { createSupabaseClient } from './supabase';
import { createMapboxClient } from './mapbox';
import { createLogger } from '../utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

/**
 * Configuration options for the Belong Platform client
 */
export interface BelongClientConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** Mapbox public access token */
  mapboxPublicToken: string;
  /** Log level (default: 'info') */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
}

/**
 * Configured Belong Platform client instances
 */
export interface BelongClient {
  /** Configured Supabase client */
  supabase: SupabaseClient<Database>;
  /** Configured Mapbox client */
  mapbox: ReturnType<typeof createMapboxClient>;
  /** Configured logger */
  logger: ReturnType<typeof createLogger>;
}

/**
 * Creates a configured Belong Platform client
 * 
 * @param config - Client configuration options
 * @returns Configured client instances
 * 
 * @example
 * ```typescript
 * const client = createBelongClient({
 *   supabaseUrl: 'https://your-project.supabase.co',
 *   supabaseAnonKey: 'your-anon-key',
 *   mapboxPublicToken: 'your-mapbox-token',
 *   logLevel: 'info' // optional, defaults to 'info'
 * });
 * 
 * // Use the configured clients
 * const { data } = await client.supabase.from('communities').select('*');
 * const addresses = await client.mapbox.searchAddresses('Austin, TX');
 * client.logger.info('Application started');
 * ```
 */
export function createBelongClient(config: BelongClientConfig): BelongClient {
  const {
    supabaseUrl,
    supabaseAnonKey,
    mapboxPublicToken,
    logLevel = 'info'
  } = config;

  // Validate required configuration
  if (!supabaseUrl) {
    throw new Error('supabaseUrl is required');
  }
  if (!supabaseAnonKey) {
    throw new Error('supabaseAnonKey is required');
  }
  if (!mapboxPublicToken) {
    throw new Error('mapboxPublicToken is required');
  }

  // Create configured instances
  const logger = createLogger(logLevel);
  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, logger);
  const mapbox = createMapboxClient(mapboxPublicToken, logger);

  return {
    supabase,
    mapbox,
    logger
  };
}

export default createBelongClient;