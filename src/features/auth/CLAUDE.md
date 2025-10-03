# Auth

Authentication and session management using Supabase Auth.

## Purpose

The auth feature handles:
- User sign up with email/password
- User sign in with email/password
- Session management and current user state
- Profile updates for authenticated users
- Sign out and session cleanup

Integrates with Supabase Auth system for secure authentication.

## Key Entities

### Account

Represents the authenticated user's account information from Supabase Auth.

**Key Fields:**
- `id` - User ID (from auth.users)
- `email` - User's email address
- `firstName` - User's first name
- `lastName` - User's last name
- `fullName` - Combined full name
- `avatarUrl` - Profile picture URL
- `location` - User's coordinates (lat/lng)
- `createdAt` - Account creation date
- `updatedAt` - Last update date

**Notes:**
- Returned by sign in/sign up operations
- Transformed from Supabase snake_case to camelCase
- Authentication domain entity
- Not cached - used for auth operations only

## Core Concepts

### Authentication vs User Profile

**Account** (Auth Domain)
- Returned by authentication operations
- Represents Supabase auth.users data
- Not cached by auth mutations
- Used for sign in/sign up responses

**User** (Application Domain)
- Fetched by `useCurrentUser()`
- Combines auth data with profile data
- Cached with React Query
- Used throughout application

### Sign Up Flow

1. User provides email, password, and profile info
2. Supabase creates auth.users record
3. Profile metadata stored in user_metadata
4. Returns Account object
5. User can then fetch profile with `useCurrentUser()`

### Sign In Flow

1. User provides email and password
2. Supabase validates credentials
3. Session established in browser storage
4. Returns Account object
5. Session persists for subsequent requests

### Current User

The `useCurrentUser()` hook:
- Fetches current auth state from Supabase
- Combines with profile data
- Returns User object
- Cached with 5-minute stale time
- Automatically invalidated on sign out

### Session Management

Sessions handled automatically by Supabase:
- Stored in browser localStorage
- Auto-refresh before expiration
- Persists across page refreshes
- Cleared on sign out

## API Reference

### Hooks
- `useCurrentUser()` - Get current authenticated user (cached query)
- `useSignIn()` - Sign in mutation hook
- `useSignUp()` - Sign up mutation hook
- `useSignOut()` - Sign out mutation hook
- `useUpdateProfile()` - Update profile mutation hook

### Key Functions
- `signIn(supabase, email, password)` - Authenticate user, returns Account
- `signUp(supabase, credentials)` - Create new account, returns Account
- `signOut(supabase)` - End session, invalidates current user cache
- `getCurrentUser(supabase)` - Fetch current user data as User object
- `updateProfile(supabase, updates)` - Update user profile

## Important Patterns

### Clean Domain Separation

Auth mutations work with Account, queries work with User:
```typescript
// Sign in returns Account (not cached)
const signIn = useSignIn();
const account = await signIn.mutateAsync({ email, password });

// Fetch User profile separately (cached)
const { data: currentUser } = useCurrentUser();
```

### Current User Hook

Use for reactive current user state:
```typescript
const { data: currentUser, isLoading } = useCurrentUser();

if (isLoading) return <Loading />;
if (!currentUser) return <SignIn />;

return <Profile user={currentUser} />;
```

### Sign In

```typescript
const signIn = useSignIn();

await signIn.mutateAsync({
  email: 'user@example.com',
  password: 'password123'
});
```

### Sign Up

```typescript
const signUp = useSignUp();

await signUp.mutateAsync({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  avatarUrl: 'https://...'
});
```

### Profile Updates

```typescript
const updateProfile = useUpdateProfile();

await updateProfile.mutateAsync({
  firstName: 'Jane',
  avatarUrl: 'https://...',
  location: { lat: 47.6062, lng: -122.3321 }
});
```

### Protected Routes

Check authentication before rendering:
```typescript
const { data: currentUser } = useCurrentUser();

if (!currentUser) {
  return <Navigate to="/sign-in" />;
}

return <ProtectedContent />;
```

### No Cache Pollution

Auth mutations don't interfere with User cache:
- `useSignIn/useSignUp` return Account but don't cache anything
- Only `useCurrentUser` maintains cached User data
- Clear separation prevents timing issues
- Eliminates type conflicts between Account and User