import { createBelongClient, type BelongClient, type BelongClientConfig } from './client';

/**
 * Global client instance - set via initializeBelong()
 * Use globalThis to ensure singleton across module boundaries
 */
const GLOBAL_KEY = '__BELONG_CLIENT__';

function getGlobalClient(): BelongClient | null {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as BelongClient | null || null;
}

function setGlobalClient(client: BelongClient | null): void {
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = client;
}

/**
 * Initialize the Belong platform with configuration
 * 
 * This should be called once at the start of your application before using any
 * Belong platform functions.
 * 
 * @param config - Configuration for the Belong platform
 * 
 * @example
 * ```typescript
 * // At app startup (e.g., main.tsx)
 * import { initializeBelong } from '@belongnetwork/platform';
 * 
 * initializeBelong({
 *   supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
 *   supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
 *   mapboxPublicToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN
 * });
 * ```
 */
export function initializeBelong(config: BelongClientConfig): void {
  setGlobalClient(createBelongClient(config));
}

/**
 * Get the global Belong client instance
 * 
 * @returns The configured Belong client
 * @throws Error if initializeBelong() has not been called
 * 
 * @example
 * ```typescript
 * const { supabase, logger } = getBelongClient();
 * ```
 */
export function getBelongClient(): BelongClient {
  const globalClient = getGlobalClient();
  if (!globalClient) {
    throw new Error(
      'Belong platform not initialized. Call initializeBelong() with your configuration before using any Belong functions.\n\n' +
      'Example:\n' +
      'import { initializeBelong } from \'@belongnetwork/platform\';\n' +
      'initializeBelong({\n' +
      '  supabaseUrl: "your-url",\n' +
      '  supabaseAnonKey: "your-key",\n' +
      '  mapboxPublicToken: "your-token"\n' +
      '});'
    );
  }
  return globalClient;
}

/**
 * Check if the Belong platform has been initialized
 * 
 * @returns true if initialized, false otherwise
 */
export function isInitialized(): boolean {
  return getGlobalClient() !== null;
}

/**
 * Reset the global configuration (mainly for testing)
 * 
 * @internal
 */
export function resetBelongClient(): void {
  setGlobalClient(null);
}