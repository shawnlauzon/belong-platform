# Users

User profile management with public/private data distinction and metadata storage.

## Purpose

The users feature manages user profiles with:
- Public profile information visible to all users
- Private information visible only to the user themselves
- Profile metadata stored in Supabase auth system
- User discovery and search capabilities

## Key Entities

### UserSummary

Minimal user info for displaying in lists, comments, and previews.

**Key Fields:**
- `id` - User ID
- `firstName` - User's first name
- `lastName` - User's last name
- `fullName` - Combined full name
- `avatarUrl` - Profile picture URL

**Notes:**
- Used throughout the app for author attribution
- All fields optional except `id`
- Lightweight for efficient queries

### User

Full public profile visible to all users.

**Key Fields:**
- All UserSummary fields
- `bio` - User bio/description
- `createdAt` - Account creation date
- `updatedAt` - Last profile update

**Notes:**
- What any user can see about another user
- Used in profile pages and directories
- Does not include private data like email or location

### CurrentUser

Extended profile with private fields for the authenticated user.

**Key Fields:**
- All User fields
- `email` - User's email address
- `location` - User's coordinates (lat/lng)

**Notes:**
- Only accessible by the user themselves
- Includes sensitive private information
- Used in settings and edit forms

### UserMetadata

JSONB structure stored in Supabase auth.users table.

**Key Fields:**
- `first_name` - Stored as snake_case
- `last_name` - Stored as snake_case
- `full_name` - Stored as snake_case
- `avatar_url` - Stored as snake_case
- `bio` - User biography
- `location` - Object with lat/lng

**Notes:**
- Stored in auth.users.user_metadata column
- Snake_case naming convention for database
- Transformed to camelCase in domain models

## Core Concepts

### Public vs Private Data

**Public Data (visible to all):**
- Name fields (first, last, full)
- Avatar URL
- Bio
- Account creation date

**Private Data (user only):**
- Email address
- Location coordinates

### User Discovery

Users can be queried by:
- ID (single or batch)
- Name search
- Community membership

### Profile Updates

Profile changes sync to auth.users.user_metadata:
- Name changes
- Avatar updates
- Bio modifications
- Location updates

## API Reference

### Query Hooks
- `useUsers(filter?)` - Get multiple users with optional filter
- `useUser(id)` - Get single user by ID

### Mutation Hooks
- `useCreateUser()` - Create new user profile
- `useUpdateUser()` - Update user profile
- `useDeleteUser()` - Delete user account

### Key Functions
- `fetchUsers(supabase, filter?)` - Fetch users with filters
- `fetchUserById(supabase, id)` - Fetch single user
- `updateUser(supabase, id, updates)` - Update user profile

## Important Patterns

### User Type Selection

Use appropriate user type based on context:
```typescript
// For lists, comments, author attribution
const author: UserSummary = comment.author;

// For public profile pages
const profile: User = await fetchUserById(userId);

// For current user settings
const currentUser: CurrentUser = useCurrentUser();
```

### Metadata Transformation

User metadata uses snake_case in database, camelCase in app:
```typescript
// Database (auth.users.user_metadata)
{
  first_name: "John",
  last_name: "Doe",
  avatar_url: "https://..."
}

// Domain model (User)
{
  firstName: "John",
  lastName: "Doe",
  avatarUrl: "https://..."
}
```

### Privacy Boundaries

Never expose private data in public contexts:
```typescript
// ❌ Wrong - exposing email in public API
export type User = {
  email: string; // Private!
}

// ✅ Correct - separate types for public/private
export type User = { /* public fields */ };
export type CurrentUser = User & { email: string };
```

### User Queries

Efficient user fetching patterns:
```typescript
// Single user
const user = useUser(userId);

// Multiple users by ID
const userIds = comments.map(c => c.authorId);
const users = useUsers({ ids: userIds });

// Search by name
const users = useUsers({ name: searchTerm });
```