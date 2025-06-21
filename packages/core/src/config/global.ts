// DEPRECATED: This file is deprecated and will be removed in a future version
// Use BelongProvider with config prop instead

import { createBelongClient, type BelongClient, type BelongClientConfig } from './client';

/**
 * Global client instance - set via initializeBelong()
 * 
 * @deprecated Use BelongProvider with config prop instead
 */
const GLOBAL_KEY = '__BELONG_CLIENT__';

function getGlobalClient(): BelongClient | null {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as BelongClient | null || null;
}

function setGlobalClient(client: BelongClient | null): void {
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = client;
}

/**
 * @deprecated Use BelongProvider with config prop instead
 */
export function initializeBelong(config: BelongClientConfig): void {
  setGlobalClient(createBelongClient(config));
}

/**
 * @deprecated Use BelongProvider with config prop instead
 */
export function getBelongClient(): BelongClient {
  const globalClient = getGlobalClient();
  if (!globalClient) {
    throw new Error(
      'Belong platform not initialized. Use BelongProvider with config prop instead:\n\n' +
      '<BelongProvider config={{supabaseUrl, supabaseAnonKey, mapboxPublicToken}}>\n' +
      '  <YourApp />\n' +
      '</BelongProvider>'
    );
  }
  return globalClient;
}

/**
 * @deprecated Use BelongProvider with config prop instead
 */
export function isInitialized(): boolean {
  return getGlobalClient() !== null;
}

/**
 * @deprecated Use BelongProvider with config prop instead
 */
export function resetBelongClient(): void {
  setGlobalClient(null);
}