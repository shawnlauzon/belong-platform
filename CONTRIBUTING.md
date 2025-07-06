# Contributing to Belong Network Platform

Thank you for contributing to the Belong Network Platform! This guide documents the established patterns and best practices for adding new features and maintaining consistency across the codebase.

## Development Setup

### Environment Variables

Create a `.env` file with:

```env
# Required for development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token

# For testing
SUPABASE_SERVICE_KEY=your-service-key
```

### Commands

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Build package
pnpm build

# Lint code
pnpm lint

# Before committing
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Feature Structure

Each feature follows a consistent directory structure:

```
src/features/{feature-name}/
├── __tests__/          # Unit tests
├── api/                # API functions
├── hooks/              # React Query hooks
├── transformers/       # Data transformation
├── types/              # Type definitions
│   ├── domain.ts       # Domain interfaces
│   └── database.ts     # Database types (internal)
└── index.ts            # Feature barrel export
```

## Code Patterns

### Single-Purpose Hooks

Each hook has a single, clear responsibility:

```typescript
// ✅ Good - Single purpose
export function useUser(id: string) { ... }
export function useUsers(filter?: UserFilter) { ... }
export function useCreateUser() { ... }

// ❌ Bad - Multiple purposes
export function useUserOperations() { ... }
```

### API Functions

Use direct API functions that accept dependencies:

```typescript
export async function fetchUsers(
  supabase: SupabaseClient<Database>,
  filter?: UserFilter,
): Promise<User[]> {
  const { data, error } = await supabase.from('profiles').select('*');

  if (error) throw error;
  return (data || []).map(toDomainUser);
}
```

### Transformer Patterns

Follow consistent naming conventions:

- `toDomain{Entity}()` - Database → Domain object
- `to{Entity}Info()` - Database → Lightweight info
- `forDbInsert()` - Domain → Database insert
- `forDbUpdate()` - Domain → Database update

## Testing Guidelines

### Test Philosophy

- **Test behavior, not implementation**
- **Mock only external dependencies**
- **Use real platform code in tests**
- **Write failing tests first (TDD)**

### Unit Testing

Mock at the configuration level:

```typescript
vi.mock('./config/client', () => ({
  createBelongClient: vi.fn(() => mockClient),
}));
```

### Integration Testing

Integration tests validate real database operations:

```bash
# Run integration tests
pnpm test:integration

# With verbose logging
VITEST_VERBOSE=true pnpm test:integration
```

## Debugging Guide

### Problem-Solving Methodology

1. **Write a failing test first** - Reproduce the bug in isolation
2. **Understand the real problem** - Don't just fix symptoms
3. **Test your hypothesis** - Verify against actual failures
4. **Fix the root cause** - Not workarounds
5. **Verify completely** - Both unit and integration tests pass

### Common Anti-Patterns

- **Don't mock platform code** - Test real behavior
- **Don't hide problems** - Fix the automation, not symptoms
- **Don't skip failing tests** - Understand before fixing

## Type Safety

### Requirements

- **No `any` types** - Use `unknown` with validation
- **Explicit return types** - All functions must declare returns
- **Generated database types** - Use `pnpm gen:db-types`

### Database Types

```typescript
// Internal use only
import type { Database } from '../../../shared/types/database';
import { ProfileRow } from '../types/database';

// Never expose database schema externally
```

## Query Key Convention

Use hierarchical keys for cache management:

```typescript
export const queryKeys = {
  users: {
    all: ['users'],
    byId: (id: string) => ['user', id],
    filtered: (filter: UserFilter) => ['users', filter],
  },
};
```

## Development Workflow

### Adding New Features

1. **Create API functions** - Accept Supabase client
2. **Create transformers** - Follow naming patterns
3. **Create hooks** - Single-purpose, typed
4. **Write tests** - Behavior-focused
5. **Update exports** - Feature and package level

### Before Committing

```bash
# Run full QA suite
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Version Management

1. Run `pnpm qa` to verify quality
2. Bump version in `package.json`
3. Commit with descriptive message
4. Tag with version number
5. Publish to npm

## Performance Guidelines

- **File size limit** - ~500 lines maximum
- **Extract patterns** - Reuse code after 2+ occurrences
- **Tree-shaking** - Export only what's needed

## Getting Help

- Study existing feature implementations
- Check test files for usage examples
- Ask the team for clarification

For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
