# Contributing to Belong Network Platform

Thank you for contributing to the Belong Network platform! This guide documents the established patterns and best practices for adding new features and maintaining consistency across the codebase.

## Feature Structure

Each feature follows a consistent directory structure:

```
src/features/{feature-name}/
├── __tests__/          # Unit tests for the feature
├── hooks/              # React Query hooks
│   ├── index.ts        # Barrel export
│   ├── use{Entity}.ts
│   ├── use{Entities}.ts
│   └── use{Action}.ts
├── services/           # Business logic services
│   └── {feature}.service.ts
├── transformers/       # Data transformation utilities
│   └── {entity}Transformer.ts
├── types/              # Type definitions
│   ├── index.ts        # Domain types only
│   ├── domain.ts       # Domain interfaces
│   └── database.ts     # Database types (internal)
└── index.ts            # Feature barrel export
```

## Transformer Naming Conventions

Transformers follow standardized naming patterns:

### Domain Transformations

- `toDomain{Entity}(dbRow)` - Database row → Domain object
- `to{Entity}Info(dbRow)` - Database row → Info object (lightweight)

### Database Transformations

- `forDbInsert(domainData)` - Domain data → Database insert
- `forDbUpdate(domainData)` - Domain data → Database update

### Example

```typescript
// userTransformer.ts
export function toDomainUser(profileRow: ProfileRow): User { ... }
export function toUserInfo(profileRow: ProfileRow): UserInfo { ... }
export function forDbInsert(userData: UserData): ProfileInsertDbData { ... }
export function forDbUpdate(userData: Partial<UserData>): ProfileUpdateDbData { ... }
```

## Hook Patterns

### Single-Purpose Hooks

Each hook has a single, clear responsibility:

```typescript
// ✅ Good - Single purpose
export function useUser(id: string) { ... }
export function useUsers(filter?: UserFilter) { ... }
export function useCreateUser() { ... }
export function useUpdateUser() { ... }

// ❌ Bad - Multiple purposes
export function useUserOperations() { ... }
```

### Query vs Mutation Separation

- **Queries**: Use `useQuery` for data fetching
- **Mutations**: Use `useMutation` for data modification

```typescript
// Query hook
export function useUsers(filter?: UserFilter) {
  return useQuery({
    queryKey: ['users', filter],
    queryFn: () => fetchUsers(filter),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutation hook
export function useCreateUser() {
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Service Factory Pattern

Services use dependency injection for better testability:

```typescript
export const createUserService = (supabase: SupabaseClient<Database>) => ({
  async fetchUsers(filter?: UserFilter): Promise<User[]> {
    // Implementation
  },

  async createUser(userData: UserData): Promise<User> {
    // Implementation
  },
});
```

## Query Key Conventions

Use hierarchical query keys for efficient cache management:

```typescript
// ✅ Good - Hierarchical structure
['users'][('users', filter)][('user', id)][('user', id, 'communities')][ // All users // Filtered users // Single user // User's communities
  // ❌ Bad - Flat structure
  'usersList'
]['userWithId123']['userCommunitiesFor456'];
```

## Testing Patterns

### Config-Level Mocking

Mock external dependencies at the configuration level:

```typescript
// ✅ Good - Mock Supabase calls
beforeEach(() => {
  mockSupabase.from.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
  mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
});

// ❌ Bad - Mock platform code
vi.mock('../services/user.service');
```

### Hook-Level Mocking for Components

When testing components, mock at the hook level:

```typescript
// ✅ Good - Mock hooks for component tests
vi.mock('@belongnetwork/platform', () => ({
  useUser: vi.fn(),
  useCreateUser: vi.fn(),
}));

// ❌ Bad - Mock internal implementation
vi.mock('../impl/fetchUser');
```

## Barrel Export Patterns

### Feature Barrels

Features export hooks first, then types:

```typescript
// src/features/users/index.ts
export * from './hooks';
export * from './types';
```

### Type Barrels

Type barrels only export domain types (database types are internal):

```typescript
// src/features/users/types/index.ts
export * from './domain';
// Database types are internal-only and should be imported directly when needed by internal services
```

## Type Safety Requirements

### No `any` in Production Code

- **Never** use `any` types in production code (enforced by ESLint)
- Always create proper interfaces, union types, or use type assertions
- Use `unknown` for truly unknown data that will be validated at runtime

```typescript
// ✅ Good
function processApiResponse(data: unknown): User {
  return UserSchema.parse(data);
}

// ❌ Bad
function processApiResponse(data: any): User {
  return data as User;
}
```

### Database Type Patterns

#### File Naming

- Use `database.ts` for all database-related type files
- Import database types from `database.ts` for internal use

#### Import Patterns

```typescript
// ✅ Good - Internal service
import type { Database } from '../../../shared/types/database';
import { ProfileRow, ProfileInsertDbData } from '../types/database';

// ❌ Bad - External consumption
import type { Database } from '../../../shared'; // Don't expose database schema
```

## Code Safety Guidelines

### Function Definition vs Runtime Checks

Prefer function definitions that prevent error conditions rather than runtime checks:

```typescript
// ✅ Good - Impossible by definition
function processUser(user: User) {
  // user.id is guaranteed to exist
  return user.id;
}

// ❌ Bad - Runtime check for impossible condition
function processUser(user: User) {
  if (!user.id) throw new Error('User ID required');
  return user.id;
}
```

## Development Workflow

### Test-Driven Development (TDD)

1. **Red**: Write a failing test that demonstrates the requirement
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up the implementation while keeping tests green

### Before Committing

Always run the full quality assurance suite:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Memory and Performance

### Keep Versions Aligned

- Maintain consistent package versions across the monorepo
- If you create the same code pattern more than twice, extract it into a shared function

### File Size Guidelines

- Maximum file size is around 500 lines
- Break larger files into focused, single-purpose modules

## Database Guidelines

### Schema Changes

- Never update `database.ts` directly
- Always make changes via database migrations
- After migration, run `pnpm run gen:db-types` from the types directory

### Supabase Commands

- Use Supabase MCP for most Supabase operations
- Exception: Use `gen:db-types` to generate types into `database.ts`

## Version Management

### Releasing Changes

1. Run `pnpm qa` and fix any warnings/errors
2. Bump patch version in all `package.json` files
3. Commit changes
4. Tag with the version
5. Publish

### Deprecation Policy

- Do not deprecate - remove instead
- Ensure all tests pass before removal

## Getting Started

1. Study existing features to understand established patterns
2. Follow the feature structure outlined above
3. Use TDD approach for all new code
4. Ensure type safety throughout
5. Run quality checks before committing

For questions or clarifications, refer to existing feature implementations or ask the team for guidance.
