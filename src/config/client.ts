import { createSupabaseClient } from './supabase';
import { createMapboxClient } from './mapbox';
import { logger as defaultLogger } from '../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../shared';

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
}

/**
 * Configured Belong Platform client instances
 */
export interface BelongClient {
  /** Configured Supabase client */
  supabase: SupabaseClient<Database>;
  /** Configured Mapbox client */
  mapbox: ReturnType<typeof createMapboxClient>;
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
 *   mapboxPublicToken: 'your-mapbox-token'
 * });
 *
 * // Use the configured clients
 * const { data } = await client.supabase.from('communities').select('*');
 * const addresses = await client.mapbox.searchAddresses('Austin, TX');
 * ```
 */
export function createBelongClient(config: BelongClientConfig): BelongClient {
  const { supabaseUrl, supabaseAnonKey, mapboxPublicToken } = config;

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
  const supabase = createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    defaultLogger
  );
  const mapbox = createMapboxClient(mapboxPublicToken, defaultLogger);

  return {
    supabase,
    mapbox,
  };
}

export default createBelongClient;
