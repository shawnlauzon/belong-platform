/**
 * Cache timing constants for React Query
 * These constants help maintain consistent cache behavior across the application
 */

// Cache stale times in milliseconds
export const CACHE_STALE_TIME = {
  /** 30 seconds - for frequently changing data like resource claims */
  VERY_SHORT: 30 * 1000,
  /** 2 minutes - for frequently changing data like the main feed */
  SHORT: 2 * 60 * 1000,
  /** 5 minutes - standard for most data types */
  STANDARD: 5 * 60 * 1000,
} as const;

// Commonly used values with descriptive names
export const VERY_SHORT_CACHE_TIME = CACHE_STALE_TIME.VERY_SHORT;
export const SHORT_CACHE_TIME = CACHE_STALE_TIME.SHORT;
export const STANDARD_CACHE_TIME = CACHE_STALE_TIME.STANDARD;
