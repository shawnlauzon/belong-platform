# Authentication Module Documentation

This document describes how the authentication system works in the Belong Network platform, including types, flow, and proper usage.

## Core Types

### Account vs User

The authentication system uses two distinct but related types:

#### Account (Authentication Domain)
```typescript
interface Account {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
  location?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
}
```

- **Purpose**: Represents authentication data from Supabase Auth
- **Source**: Comes directly from Supabase `auth.signInWithPassword()` and `auth.getUser()`
- **Usage**: Internal authentication operations, returned by `signIn`, `signUp` functions
- **Fields**: All camelCase (our standard), transformed from Supabase snake_case

#### User (Application Domain)
```typescript
interface User {
  id: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
  location?: Coordinates;
  createdAt: Date;
  updatedAt: Date;
}
```

- **Purpose**: Represents complete user data for application use
- **Source**: Combination of Account data + profile table data
- **Usage**: Application features, UI display, returned by `useCurrentUser`
- **Fields**: Same structure as Account, but semantically represents a complete user profile

## Authentication Flow

### 1. Sign Up Flow

```
User Input (email, password, firstName, lastName)
    ↓
useSignUp() → signUp() → supabase.auth.signUp()
    ↓
Returns: Account object
    ↓
No automatic caching (new architecture)
```

**Implementation**:
- `useSignUp()`: React Query mutation hook
- `signUp()`: Implementation function that calls Supabase
- Returns `Account` object immediately
- Does NOT cache User data (clean separation)

### 2. Sign In Flow

```
User Input (email, password)
    ↓
useSignIn() → signIn() → supabase.auth.signInWithPassword()
    ↓
Returns: Account object
    ↓
No automatic caching (new architecture)
```

**Implementation**:
- `useSignIn()`: React Query mutation hook
- `signIn()`: Implementation function that calls Supabase
- Returns `Account` object immediately
- Does NOT cache User data (clean separation)
- Establishes Supabase auth session for subsequent calls

### 3. Get Current User Flow

```
useCurrentUser() → fetchCurrentUser() → supabase.auth.getUser() + profile fetch
    ↓
Combines Account + Profile data
    ↓
Returns: User object (cached)
```

**Implementation**:
- `useCurrentUser()`: React Query that fetches fresh data
- `fetchCurrentUser()`: Gets current auth state + profile data
- Combines Account data with profile table data
- Transforms to User object
- Cached with 5-minute stale time

### 4. Sign Out Flow

```
useSignOut() → signOut() → supabase.auth.signOut()
    ↓
Invalidates ['currentUser'] cache
```

**Implementation**:
- `useSignOut()`: React Query mutation hook
- `signOut()`: Implementation function that calls Supabase
- Clears auth session and invalidates User cache

## Architecture Principles

### Clean Domain Separation

1. **Authentication mutations** (`useSignIn`, `useSignUp`, `useSignOut`):
   - Work with `Account` objects
   - Call Supabase auth directly
   - Do NOT cache anything
   - Return immediately after auth operation

2. **User query** (`useCurrentUser`):
   - Works with `User` objects  
   - Fetches fresh auth state + profile data
   - Single cache key: `['currentUser']`
   - Handles complete user profile data

### No Cache Pollution

- Auth mutations don't interfere with User cache
- Only `useCurrentUser` maintains cached User data
- Clear separation prevents type conflicts
- Eliminates timing issues between auth and profile operations

## Proper Usage Patterns

### Sign In + Get Current User
```typescript
// 1. Sign in user
const signIn = useSignIn();
const result = await signIn.mutateAsync({ email, password });
// result is Account object

// 2. Get complete user data (separate call)
const { data: currentUser } = useCurrentUser();
// currentUser is User object with profile data
```

### Check Authentication Status
```typescript
// Use useCurrentUser to check if user is authenticated
const { data: currentUser, isLoading } = useCurrentUser();

if (isLoading) return <Loading />;
if (!currentUser) return <SignInForm />;
return <AuthenticatedApp user={currentUser} />;
```

### Error Handling
```typescript
const signIn = useSignIn();

const handleSignIn = async (credentials) => {
  try {
    await signIn.mutateAsync(credentials);
    // Account created, user can now access app
  } catch (error) {
    // Handle auth errors
    console.error('Sign in failed:', error);
  }
};
```

## Implementation Files

### Hooks (`/hooks/`)
- `useSignIn.ts`: Sign in mutation hook
- `useSignUp.ts`: Sign up mutation hook  
- `useSignOut.ts`: Sign out mutation hook
- `useCurrentUser.ts`: Current user query hook

### Implementation (`/impl/`)
- `signIn.ts`: Core sign in logic with Supabase
- `signUp.ts`: Core sign up logic with Supabase
- `signOut.ts`: Core sign out logic with Supabase
- `getAccount.ts`: Utility for getting Account data

## Testing Guidelines

### Unit Test Patterns

1. **Mock external dependencies only**: Mock Supabase calls, not our platform functions
2. **Test real code paths**: Let `useSignIn` call real `signIn` implementation
3. **Verify Supabase calls**: Use spies to ensure correct Supabase functions are called
4. **Test type transformations**: Verify Account → User transformations work correctly

### Example Test Structure
```typescript
// ✅ Good: Test real platform code
mockSupabase.auth.signInWithPassword.mockResolvedValue(mockAuthData);
const { result } = renderHook(() => useSignIn());
expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();

// ❌ Bad: Mock our own platform functions
vi.mock('../../impl/signIn'); // Don't do this
```

## Session Management

### How It Works
1. `signIn()` establishes Supabase auth session
2. Session persists in browser storage
3. `useCurrentUser()` reads session via `supabase.auth.getUser()`
4. No manual session management required

### Integration Testing
- Real Supabase maintains session state between calls
- Unit tests mock session responses appropriately
- Session persistence handled by Supabase automatically

## Migration Notes

This architecture replaced a previous system that had:
- Cache pollution between auth and user domains
- Async `onSuccess` callback timing issues
- Type conflicts between Account and User objects

The new clean separation eliminates these issues by keeping auth and user profile concerns completely separate.