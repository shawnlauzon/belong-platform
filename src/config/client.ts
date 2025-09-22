import { createSupabaseClient } from './supabase';
import { createMapboxClient } from './mapbox';
import { logger as defaultLogger } from '../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

/**
 * Configuration options for the Belong Network Platform client
 */
export interface BelongClientConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** Mapbox public access token (optional) */
  mapboxPublicToken?: string;
  /** Enable realtime subscriptions (default: true) */
  enableRealtime?: boolean;
}

/**
 * Configured Belong Network Platform client instances
 */
export interface BelongClient {
  /** Configured Supabase client */
  supabase: SupabaseClient<Database>;
  /** Configured Mapbox client (null if no token provided) */
  mapbox: ReturnType<typeof createMapboxClient> | null;
}

/**
 * Creates a configured Belong Network Platform client
 *
 * @param config - Client configuration options
 * @returns Configured client instances
 *
 * @example
 * ```typescript
 * const client = createBelongClient({
 *   supabaseUrl: 'https://your-project.supabase.co',
 *   supabaseAnonKey: 'your-anon-key',
 *   mapboxPublicToken: 'your-mapbox-token' // optional
 * });
 *
 * // Use the configured clients
 * const { data } = await client.supabase.from('communities').select('*');
 * if (client.mapbox) {
 *   const addresses = await client.mapbox.searchAddresses('Austin, TX');
 * }
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

  // Create configured instances
  const supabase = createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
    defaultLogger,
  );
  const mapbox = mapboxPublicToken 
    ? createMapboxClient(mapboxPublicToken, defaultLogger)
    : null;

  return {
    supabase,
    mapbox,
  };
}

export default createBelongClient;
