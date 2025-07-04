# Service Architecture Migration

## Overview
Migrate from service-creates-service pattern to clean Component → Hook → Fetch Function → Supabase architecture.

## Core Principles
- Fetch functions are pure and return Info types (IDs only)
- Hooks compose full objects using React Query
- Only hooks and types are exported from features
- Use `@/` imports everywhere
- Delete old code completely (no deprecation)
- Happy path tests only using faker factories

## Phase 1: Setup & Shared Infrastructure

### 1.1 Create Shared Test Utilities
- [ ] Create `src/test-utils/supabase-mocks.ts`
  - [ ] Implement `createMockSupabase()` that returns typed SupabaseClient
  - [ ] Support chaining pattern: `.from().select().eq().single()`
  - [ ] Accept data fixtures: `createMockSupabase({ resources: [...] })`

### 1.2 Update TypeScript Paths
- [ ] Ensure `tsconfig.json` has `"@/*": ["src/*"]` path mapping
- [ ] Verify all packages can use `@/` imports

## Phase 2: Resources Feature Migration

### 2.1 Create New Structure
- [ ] Create directories:
  - `src/features/resources/api/`
  - `src/features/resources/__tests__/api/`
  - `src/features/resources/__tests__/hooks/`
  - `src/features/resources/__tests__/factories/`

### 2.2 Create Factory Functions
- [ ] Create `src/features/resources/__tests__/factories/resourceFactory.ts`
  ```typescript
  import { faker } from '@faker-js/faker';
  import type { ResourceRow } from '@/features/resources/types/database';
  
  export function createMockResourceRow(): ResourceRow {
    return {
      id: faker.string.uuid(),
      title: faker.commerce.productName(),
      // ... all fields from ResourceRow type
    };
  }
  
  export function createMockResourceInfo(overrides?: Partial<ResourceInfo>): ResourceInfo {
    // Transform Row to Info
  }
  ```

### 2.3 Implement Fetch Functions
- [ ] Create `src/features/resources/api/fetchResourceById.ts`
  - Return type: `Promise<ResourceInfo | null>`
  - Use `toResourceInfo()` transformer
- [ ] Create `src/features/resources/api/fetchResources.ts`
  - Return type: `Promise<ResourceInfo[]>`
- [ ] Create `src/features/resources/api/createResource.ts`
- [ ] Create `src/features/resources/api/updateResource.ts`
- [ ] Create `src/features/resources/api/deleteResource.ts`

### 2.4 Write API Tests
- [ ] Create `src/features/resources/__tests__/api/fetchResourceById.test.ts`
  ```typescript
  import { createMockSupabase } from '@/test-utils/supabase-mocks';
  import { createMockResourceRow } from '../factories/resourceFactory';
  
  describe('fetchResourceById', () => {
    it('returns ResourceInfo when resource exists', async () => {
      const mockRow = createMockResourceRow();
      const supabase = createMockSupabase({ resources: [mockRow] });
      
      const result = await fetchResourceById(supabase, mockRow.id);
      
      expect(result?.id).toBe(mockRow.id);
      expect(result?.ownerId).toBe(mockRow.owner_id);
    });
  });
  ```
- [ ] Repeat for other fetch functions (happy path only)

### 2.5 Update Hooks
- [ ] Update `useResource.ts` to:
  - Import fetch functions from `../api/`
  - Remove service creation
  - Compose Resource from ResourceInfo + User + Community
- [ ] Update `useResources.ts`
- [ ] Update `useCreateResource.ts`
- [ ] Update `useUpdateResource.ts`
- [ ] Update `useDeleteResource.ts`

### 2.6 Update Barrel Exports
- [ ] Update `src/features/resources/hooks/index.ts`
  ```typescript
  export * from './useResource';
  export * from './useResources';
  // ... all hooks
  ```
- [ ] Update `src/features/resources/types/index.ts`
  ```typescript
  export * from './domain';
  export * from './database';
  ```
- [ ] Update `src/features/resources/index.ts`
  ```typescript
  export * from './hooks';
  export * from './types';
  ```

### 2.7 Clean Up
- [ ] Delete `src/features/resources/services/` directory
- [ ] Delete all old service tests
- [ ] Delete old hook tests that test implementation
- [ ] Update all imports to use `@/features/resources`

### 2.8 Verify
- [ ] Run unit tests: `pnpm test`
- [ ] Run integration tests: `pnpm test:integration`
- [ ] Run type check: `pnpm typecheck`
- [ ] Run lint: `pnpm lint`

## Phase 3: Users Feature Migration

### 3.1 Create Structure
- [ ] Same directory structure as Resources

### 3.2 Create Factory
- [ ] `createMockUserRow(): UserRow`
- [ ] `createMockUser(): User`

### 3.3 Implement Fetch Functions
- [ ] `fetchUserById(supabase, id): Promise<User | null>`
- [ ] `fetchUsers(supabase, filters?): Promise<User[]>`
- [ ] Note: Users don't have nested objects, return full User

### 3.4 Update Hooks & Tests
- [ ] Update all user hooks
- [ ] Write happy path tests

### 3.5 Clean Up
- [ ] Delete user service
- [ ] Delete old tests
- [ ] Update imports

## Phase 4: Communities Feature Migration

### 4.1-4.5 Same Pattern
- [ ] Follow same steps as Users
- [ ] `fetchCommunityById` returns full Community

## Phase 5: Events Feature Migration

### 5.1 Complex Composition
- [ ] Events have organizer (User) and community
- [ ] Follow Resource pattern for composition in hooks

## Phase 6: Shoutouts Feature Migration

### 6.1 Most Complex
- [ ] Shoutouts have fromUser, toUser, and resource
- [ ] useShoutout will need 4 queries total

## Phase 7: Conversations Feature Migration

### 7.1 Messages
- [ ] Messages have fromUser and toUser
- [ ] Follow established patterns

## Phase 8: Final Cleanup

### 8.1 Remove Service Patterns
- [ ] Search for any remaining `createXService` patterns
- [ ] Ensure no service-creates-service code remains

### 8.2 Update Documentation
- [ ] Update architecture docs to reflect new pattern
- [ ] Add examples of fetch function usage

### 8.3 Final Verification
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No lint warnings
- [ ] Integration tests work

## Success Criteria
- [ ] No services creating other services
- [ ] All features use fetch functions + hooks pattern
- [ ] All imports use `@/` paths
- [ ] Only hooks and types exported from features
- [ ] React Query cache properly utilized
- [ ] All old code deleted