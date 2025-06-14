// Export all dashboard modules
export * from './auth';
export * from './communities';
export * from './resources';
export * from './users';

// Re-export core utilities that might be needed
export { logger } from '@belongnetwork/core';

// Re-export common types
export type {
  ApiResponse,
  PaginatedResponse
} from '@belongnetwork/types';