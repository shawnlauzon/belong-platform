# Supabase Mocking Brittleness - Refactoring Example

## Problem: Brittle Test with Complex Supabase Mocking

### Before: fetchResources.test.ts (Brittle)

```typescript
describe('fetchResources', () => {
  const mockSupabase = createMockSupabase();

  it('should filter out expired resources', async () => {
    const mockQuery = {
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [createFakeResourceRow()],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    } as any);

    await fetchResources(mockSupabase);

    // Brittle: Testing implementation details
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
    expect(mockQuery.or).toHaveBeenCalledWith('expires_at.is.null,expires_at.gt.now()');
  });
});
```

**Problems:**
- Tests database query structure, not business logic
- Complex mock setup that breaks when query changes
- Type casting to `any` due to mock limitations
- Focuses on HOW rather than WHAT

## Solution: Extract Business Logic + Contract Testing

### Step 1: Extract Pure Business Logic

```typescript
// src/features/resources/business/resourceFilters.ts
export function isResourceActive(resource: { expires_at: string | null }): boolean {
  if (!resource.expires_at) return true;
  return new Date(resource.expires_at) > new Date();
}

export function filterActiveResources<T extends { expires_at: string | null }>(
  resources: T[]
): T[] {
  return resources.filter(isResourceActive);
}

export function applyResourceFilters<T extends ResourceRowData>(
  resources: T[],
  filters?: ResourceFilter
): T[] {
  if (!filters) return resources;
  
  return resources.filter(resource => {
    if (filters.status && resource.status !== filters.status) return false;
    if (filters.ownerId && resource.owner_id !== filters.ownerId) return false;
    if (filters.communityId && !resource.resource_communities?.some(
      rc => rc.community_id === filters.communityId
    )) return false;
    return true;
  });
}

export function sortResourcesByCreation<T extends { created_at: string }>(
  resources: T[],
  ascending = false
): T[] {
  return [...resources].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
  });
}
```

### Step 2: Pure Function Tests (Zero Mocking)

```typescript
// src/features/resources/business/__tests__/resourceFilters.test.ts
describe('Resource Business Logic', () => {
  describe('isResourceActive', () => {
    it('should return true for resources without expiration', () => {
      const resource = { expires_at: null };
      expect(isResourceActive(resource)).toBe(true);
    });

    it('should return true for resources expiring in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const resource = { expires_at: futureDate.toISOString() };
      expect(isResourceActive(resource)).toBe(true);
    });

    it('should return false for expired resources', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const resource = { expires_at: pastDate.toISOString() };
      expect(isResourceActive(resource)).toBe(false);
    });
  });

  describe('filterActiveResources', () => {
    it('should filter out expired resources', () => {
      const resources = [
        createFakeResourceRow({ expires_at: null }),
        createFakeResourceRow({ expires_at: '2020-01-01' }), // Expired
        createFakeResourceRow({ expires_at: '2030-01-01' }), // Future
      ];

      const result = filterActiveResources(resources);
      expect(result).toHaveLength(2);
    });
  });

  describe('applyResourceFilters', () => {
    it('should filter by status', () => {
      const resources = [
        createFakeResourceRow({ status: 'open' }),
        createFakeResourceRow({ status: 'closed' }),
      ];

      const result = applyResourceFilters(resources, { status: 'open' });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('open');
    });

    it('should filter by community', () => {
      const resources = [
        createFakeResourceRow({ 
          resource_communities: [{ community_id: 'community-1' }]
        }),
        createFakeResourceRow({ 
          resource_communities: [{ community_id: 'community-2' }]
        }),
      ];

      const result = applyResourceFilters(resources, { communityId: 'community-1' });
      expect(result).toHaveLength(1);
    });
  });
});
```

### Step 3: Simplified API with Repository Pattern

```typescript
// src/features/resources/repositories/ResourceRepository.ts
export interface ResourceRepository {
  findAllWithRelations(): Promise<ResourceRowJoinCommunitiesJoinTimeslots[]>;
}

export class SupabaseResourceRepository implements ResourceRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findAllWithRelations(): Promise<ResourceRowJoinCommunitiesJoinTimeslots[]> {
    const { data, error } = await this.supabase
      .from('resources')
      .select(SELECT_RESOURCES_JOIN_COMMUNITIES_JOIN_TIMESLOTS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

// src/features/resources/services/ResourceService.ts
export class ResourceService {
  constructor(private repository: ResourceRepository) {}

  async getActiveResources(filters?: ResourceFilter): Promise<ResourceSummary[]> {
    // Get all data from repository
    const allResources = await this.repository.findAllWithRelations();
    
    // Apply business logic using pure functions
    const activeResources = filterActiveResources(allResources);
    const filteredResources = applyResourceFilters(activeResources, filters);
    const sortedResources = sortResourcesByCreation(filteredResources);
    
    // Transform to domain objects
    return sortedResources.map(toDomainResourceSummary);
  }
}
```

### Step 4: Service Tests (Simple Interface Mocking)

```typescript
// src/features/resources/services/__tests__/ResourceService.test.ts
describe('ResourceService', () => {
  let service: ResourceService;
  let mockRepository: jest.Mocked<ResourceRepository>;

  beforeEach(() => {
    mockRepository = {
      findAllWithRelations: vi.fn(),
    };
    service = new ResourceService(mockRepository);
  });

  it('should return active filtered resources', async () => {
    // Arrange: Simple mock data
    const mockData = [
      createFakeResourceRow({ status: 'open', expires_at: null }),
      createFakeResourceRow({ status: 'closed', expires_at: null }),
      createFakeResourceRow({ status: 'open', expires_at: '2020-01-01' }), // Expired
    ];
    mockRepository.findAllWithRelations.mockResolvedValue(mockData);

    // Act
    const result = await service.getActiveResources({ status: 'open' });

    // Assert: Business outcomes
    expect(result).toHaveLength(1); // Only active + open
    expect(result[0]).toEqual(expect.objectContaining({
      status: 'open',
      id: expect.any(String),
    }));

    // Verify repository interaction
    expect(mockRepository.findAllWithRelations).toHaveBeenCalledOnce();
  });

  it('should handle empty data gracefully', async () => {
    mockRepository.findAllWithRelations.mockResolvedValue([]);

    const result = await service.getActiveResources();
    expect(result).toEqual([]);
  });
});
```

### Step 5: Contract Test for Repository (Minimal Mocking)

```typescript
// src/features/resources/repositories/__tests__/SupabaseResourceRepository.test.ts
describe('SupabaseResourceRepository', () => {
  let repository: SupabaseResourceRepository;
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    repository = new SupabaseResourceRepository(mockSupabase);
  });

  it('should return all resources with relations', async () => {
    // Minimal mocking - just the final result
    const mockData = [createFakeResourceRow()];
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null })
      })
    } as any);

    const result = await repository.findAllWithRelations();

    expect(result).toEqual(mockData);
  });

  it('should throw error when query fails', async () => {
    const mockError = new Error('Database error');
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: mockError })
      })
    } as any);

    await expect(repository.findAllWithRelations()).rejects.toThrow('Database error');
  });
});
```

## Benefits of Refactored Approach

### ✅ **Reduced Brittleness**
- **Pure function tests**: Zero mocking = zero brittleness
- **Simple interface mocks**: Repository interface easier to mock than Supabase
- **Contract focus**: Test what the API promises, not how it works

### ✅ **Better Test Coverage**
- **Business logic**: Thoroughly tested in isolation
- **Edge cases**: Easy to test with pure functions
- **Error handling**: Clear separation between business and infrastructure errors

### ✅ **Maintainability**
- **Focused tests**: Each test validates one concern
- **Stable tests**: Business logic tests remain stable during database changes
- **Clear boundaries**: Separation between business logic and data access

### ✅ **Development Speed**
- **Fast tests**: Pure functions execute instantly
- **Easy debugging**: Clear test failures point to exact business logic issues
- **Confident refactoring**: Strong test coverage enables safe changes

## Migration Strategy

1. **Extract business logic** from existing API functions into pure functions
2. **Write pure function tests** with comprehensive coverage
3. **Create repository interfaces** for data access
4. **Implement service layer** that combines repository + business logic  
5. **Replace complex API tests** with simple service + repository tests
6. **Keep integration tests** for end-to-end validation

This approach eliminates the brittleness of Supabase mocking while providing better test coverage and maintainability.