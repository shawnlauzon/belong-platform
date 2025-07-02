# Code Style and Conventions

## TypeScript Conventions
- **Strict mode enabled** - No implicit any types
- **Explicit type annotations** required for all functions and components
- **Never use `any` types** - Use proper interfaces, union types, or type assertions
- **Use generated database types** from @belongnetwork/types
- **Prefer type-safe patterns** over casting or type assertions

## File Organization
- **Feature-based structure** under `src/features/`
- **Single-purpose hooks** - Each hook serves one specific purpose
- **Maximum file size** around 500 lines
- **Barrel exports** from index.ts files
- **Tests in `__tests__` directories** within each feature

## Naming Conventions
- **React hooks**: `use` prefix (e.g., `useSignIn`, `useCurrentUser`)
- **Services**: Named exports with `create` prefix (e.g., `createAuthService`)
- **Types**: PascalCase for interfaces/types
- **Database types**: Suffix with `Row`, `InsertDbData`, `UpdateDbData`
- **Domain types**: Clean names without suffixes

## Code Patterns
- **Study existing files** for established patterns before creating new ones
- **Hook return patterns**:
  - Query hooks: Return React Query result directly
  - Mutation hooks: Return stable function reference using `useCallback`
- **Service pattern**: Services created with factory functions
- **Error handling**: Log errors with logger, let React Query handle error states

## Comments and Documentation
- **DO NOT ADD COMMENTS** unless explicitly asked
- **JSDoc only for public APIs** that are exported
- **Let code be self-documenting** through clear naming

## Testing Patterns
- **Use createMock* utilities** from test-utils for test data
- **Mock only external dependencies** (Supabase), never platform code
- **Tests in dedicated `__tests__` directories**
- **Integration tests** in `tests/integration` directory