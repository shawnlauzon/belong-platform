/**
 * Standardized query keys for the authentication system
 * This prevents cache inconsistency by using a single source of truth
 */
export const queryKeys = {
  // Authentication state (not profile data)
  auth: ['auth'] as const,
  
  // User profile data - single source of truth for all user queries
  users: {
    all: ['users'] as const,
    byId: (id: string) => ['user', id] as const,
  },
} as const;