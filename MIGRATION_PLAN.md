# Migration Plan: Zod-Based Architecture

## Overview

This document outlines the migration from the current three-tier type system (Data/Domain/Info) to a Zod-based type system with consolidated hooks. The migration is designed to be incremental, allowing both systems to coexist during the transition.

## Current State Analysis

### Entities to Migrate

- **User** (3 transformer functions, 5 hooks)
- **Community** (4 transformer functions, 9 hooks)
- **Resource** (4 transformer functions, 5 hooks)
- **Event** (4 transformer functions, 8 hooks)
- **Thanks** (4 transformer functions, 5 hooks)
- **EventAttendance** (3 transformer functions, included in Event hooks)

### Total Scope

- 22 transformer functions to replace
- 37 individual hooks to consolidate into 6
- 6 service layers to update
- All tests to update for new patterns

## Migration Phases

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Package Dependencies

```bash
# Add to packages/types/package.json
pnpm add zod
pnpm add -D tsx @types/lodash
pnpm add lodash
```

#### 1.2 Directory Structure

```
packages/types/src/
├── schemas/
│   ├── base.schema.ts      # Shared schemas and utilities
│   ├── user.schema.ts
│   ├── community.schema.ts
│   ├── resource.schema.ts
│   ├── event.schema.ts
│   ├── thanks.schema.ts
│   └── index.ts
├── utils/
│   ├── transformers.ts     # Case transformation utilities
│   └── validators.ts       # Custom validators
└── generated/              # Auto-generated types
```

#### 1.3 Base Utilities

Create transformation utilities for:

- camelCase ↔ snake_case conversion
- PostGIS point handling
- Date string parsing
- JSON field handling

#### 1.4 Build Scripts

```json
{
  "scripts": {
    "gen:types": "tsx scripts/generate-types.ts",
    "gen:db-types": "supabase gen types typescript --project-id $PROJECT_ID",
    "migrate:apply": "tsx scripts/migrate-and-generate.ts",
    "validate:schemas": "tsx scripts/validate-schemas.ts"
  }
}
```

### Phase 2: User Entity Pilot (Week 2)

Start with User as it's the simplest entity:

#### 2.1 Create User Schema

```typescript
// schemas/user.schema.ts
export const UserSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
  location: CoordinatesSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

#### 2.2 Update User Service

- Replace manual transformers with schema parsing
- Add validation to all operations
- Keep existing function signatures for compatibility

#### 2.3 Create Consolidated useUsers Hook

- Combine all 5 user hooks into one
- Maintain backward compatibility exports
- Add deprecation notices to old hooks

#### 2.4 Update Tests

- Create schema-based mock generators
- Update service tests
- Add validation tests

### Phase 3: Core Entities Migration (Weeks 3-4)

Migrate remaining entities in dependency order:

#### 3.1 Community Entity

- Most complex due to hierarchical structure
- Handle PostGIS geometry fields
- Migrate 9 hooks to 1

#### 3.2 Resource Entity

- Depends on User and Community
- Handle location and enum fields
- Migrate 5 hooks to 1

#### 3.3 Event Entity

- Similar complexity to Resource
- Handle date/time fields
- Migrate 8 hooks to 1

#### 3.4 Thanks Entity

- Depends on User and Resource
- Simplest relationship structure
- Migrate 5 hooks to 1

### Phase 4: Integration & Testing (Week 5)

#### 4.1 Cross-Entity Testing

- Test schema relationships
- Validate transformations
- Performance testing

#### 4.2 Migration Scripts

Create scripts to help consumers migrate:

- Codemod for import updates
- Type migration guide
- Breaking change documentation

#### 4.3 Documentation Updates

- Update ARCHITECTURE.md
- Update CLAUDE.md
- Create migration guide for consumers

### Phase 5: Cleanup & Optimization (Week 6)

#### 5.1 Remove Legacy Code

- Delete old transformer files
- Remove deprecated hooks
- Clean up old type definitions

#### 5.2 Performance Optimization

- Implement schema caching
- Optimize transformation functions
- Bundle size analysis

#### 5.3 Developer Experience

- Add better error messages
- Improve TypeScript inference
- Create developer tools

## Migration Strategy for Each Entity

### Step-by-Step Process

1. **Create Schema File**

   - Define base schema
   - Create variants (Create, Update, List, WithRelations)
   - Add transformation schemas

2. **Update Service Layer**

   ```typescript
   // Before
   const communities = data.map(toCommunityInfo);

   // After
   const communities = z.array(CommunityListSchema).parse(data);
   ```

3. **Create Consolidated Hook**

   ```typescript
   // New pattern
   export function useCommunities() {
     return {
       communities: listQuery.data,
       getCommunity: (id) => /* ... */,
       create: createMutation.mutateAsync,
       update: updateMutation.mutateAsync,
       delete: deleteMutation.mutateAsync,
       // ... other operations
     };
   }
   ```

4. **Maintain Compatibility**

   ```typescript
   // Temporary backward compatibility
   export const useCreateCommunity = () => {
     console.warn(
       "useCreateCommunity is deprecated. Use useCommunities().create",
     );
     const { create } = useCommunities();
     return { mutateAsync: create };
   };
   ```

5. **Update Tests**
   - Use schema.parse() for test data generation
   - Mock at appropriate levels
   - Test validation edge cases

## Rollback Plan

If issues arise during migration:

1. **Feature Flags**: Use environment variables to toggle between old/new systems
2. **Parallel Running**: Keep both systems operational during transition
3. **Gradual Rollout**: Migrate one entity at a time
4. **Quick Revert**: Git tags at each successful phase

## Success Metrics

- **Code Reduction**: Target 50% reduction in type-related code
- **Type Safety**: 100% runtime validation coverage
- **Performance**: No regression in query/mutation performance
- **Developer Experience**: Reduced time to add new fields/entities
- **Bug Reduction**: Fewer type-related runtime errors

## Risk Mitigation

### High Risk Areas

1. **PostGIS Transformations**: Complex geometry handling
2. **Backward Compatibility**: Supporting both patterns simultaneously
3. **Performance**: Schema validation overhead
4. **Bundle Size**: Zod adds ~43KB minified

### Mitigation Strategies

1. **Extensive Testing**: Each phase includes comprehensive tests
2. **Gradual Rollout**: One entity at a time
3. **Performance Monitoring**: Track validation overhead
4. **Code Splitting**: Lazy load schemas where possible

## Timeline Summary

- **Week 1**: Infrastructure setup
- **Week 2**: User entity pilot
- **Weeks 3-4**: Core entities migration
- **Week 5**: Integration and testing
- **Week 6**: Cleanup and optimization

Total Duration: 6 weeks with gradual rollout

## Next Steps

1. Review and approve migration plan
2. Set up infrastructure (Phase 1)
3. Begin User entity pilot
4. Create detailed documentation for consumers
5. Schedule regular check-ins during migration
