/**
 * Cache timing constants for React Query
 * These constants help maintain consistent cache behavior across the application
 */

// Cache stale times in milliseconds
export const CACHE_STALE_TIME = {
  /** 2 minutes - for frequently changing data like event attendances */
  SHORT: 2 * 60 * 1000,
  /** 5 minutes - standard for most data types */
  STANDARD: 5 * 60 * 1000,
  /** 10 minutes - for less frequently changing data */
  LONG: 10 * 60 * 1000,
  /** 30 minutes - for very stable data */
  EXTENDED: 30 * 60 * 1000,
} as const;

// Commonly used values with descriptive names
export const STANDARD_CACHE_TIME = CACHE_STALE_TIME.STANDARD;
export const SHORT_CACHE_TIME = CACHE_STALE_TIME.SHORT;