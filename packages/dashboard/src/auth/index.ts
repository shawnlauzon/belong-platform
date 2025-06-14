// Re-export authentication hooks from the API package
export {
  useCurrentUser,
  useSignIn,
  useSignUp,
  useSignOut,
  signIn,
  signUp,
  signOut,
  getCurrentUser
} from '@belongnetwork/api';

// Re-export authentication types
export type {
  AuthUser
} from '@belongnetwork/types';