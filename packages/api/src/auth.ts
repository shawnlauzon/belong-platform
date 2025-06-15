// Core authentication functions and hooks
// This is the main entry point for all authentication functionality

// Core authentication functions
export { signIn } from './auth/impl/signIn';
export { signUp } from './auth/impl/signUp';
export { signOut } from './auth/impl/signOut';
export { getCurrentUser } from './auth/impl/getCurrentUser';

// React Query hooks
export { useSignIn } from './auth/hooks/useSignIn';
export { useSignUp } from './auth/hooks/useSignUp';
export { useSignOut } from './auth/hooks/useSignOut';
export { useCurrentUser } from './auth/hooks/useCurrentUser';

// Error messages
export const AUTH_ERROR_MESSAGES = {
  /** Error thrown when no user data is returned from sign in */
  NO_USER_DATA_SIGN_IN: 'No user data returned from sign in',
  /** Error thrown when no user data is returned from sign up */
  NO_USER_DATA_SIGN_UP: 'No user data returned from sign up',
  /** Error thrown when user must be authenticated for an operation */
  AUTHENTICATION_REQUIRED: 'User must be authenticated to perform this operation',
} as const;
