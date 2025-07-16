import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { vi } from 'vitest';

interface MockData {
  resources?: Database['public']['Tables']['resources']['Row'][];
  profiles?: Database['public']['Tables']['profiles']['Row'][];
  communities?: Database['public']['Tables']['communities']['Row'][];
  shoutouts?: Database['public']['Tables']['shoutouts']['Row'][];
  direct_messages?: Database['public']['Tables']['direct_messages']['Row'][];
  conversations?: Database['public']['Tables']['conversations']['Row'][];
  community_memberships?: Database['public']['Tables']['community_memberships']['Row'][];
}

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  throwOnError: ReturnType<typeof vi.fn>;
}

export function createMockSupabase(data: MockData = {}): SupabaseClient<Database> {
  // Track filters
  let currentFilters: Record<string, unknown>[] = [];
  let currentTable: string = '';

  const mockQueryBuilder: MockQueryBuilder = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    throwOnError: vi.fn(),
  };

  // Chain all methods to return the builder itself
  Object.keys(mockQueryBuilder).forEach((method) => {
    if (method !== 'eq' && method !== 'insert' && method !== 'upsert' && method !== 'select' && method !== 'single' && method !== 'maybeSingle') {
      (mockQueryBuilder as Record<string, jest.MockedFunction<(...args: unknown[]) => unknown>>)[method].mockReturnValue(mockQueryBuilder);
    }
  });

  // Track filter calls
  mockQueryBuilder.eq.mockImplementation((column: string, value: unknown) => {
    currentFilters.push({ type: 'eq', column, value });
    return mockQueryBuilder;
  });

  // Handle insert with select
  let insertedData: unknown = null;
  mockQueryBuilder.insert.mockImplementation((data: unknown) => {
    insertedData = Array.isArray(data) ? data : [data];
    return mockQueryBuilder;
  });

  // Handle upsert with select
  let upsertedData: unknown = null;
  mockQueryBuilder.upsert.mockImplementation((data: unknown) => {
    upsertedData = Array.isArray(data) ? data : [data];
    return mockQueryBuilder;
  });

  // Handle order - it should return a thenable
  mockQueryBuilder.order.mockImplementation(() => {
    const mockData = data[currentTable as keyof MockData] || [];
    const filtered = applyFilters(mockData);
    
    // Return a thenable object
    return {
      then: (onFulfilled: (value: { data: unknown; error: null }) => unknown) => {
        return Promise.resolve({ data: filtered, error: null }).then(onFulfilled);
      }
    };
  });

  // Helper to apply filters
  const applyFilters = (data: Record<string, unknown>[]) => {
    return data.filter(row => {
      return currentFilters.every(filter => {
        if (filter.type === 'eq') {
          return (row as Record<string, unknown>)[filter.column as string] === filter.value;
        }
        return true;
      });
    });
  };

  // Special handling for terminal methods
  mockQueryBuilder.single.mockImplementation(() => {
    const mockData = data[currentTable as keyof MockData] || [];
    const filtered = applyFilters(mockData);
    
    if (filtered.length === 0) {
      return Promise.resolve({ data: null, error: null });
    }
    
    return Promise.resolve({ data: filtered[0], error: null });
  });

  mockQueryBuilder.maybeSingle.mockImplementation(() => {
    const mockData = data[currentTable as keyof MockData] || [];
    const filtered = applyFilters(mockData);
    
    return Promise.resolve({ data: filtered[0] || null, error: null });
  });

  // Default implementation for select (returns all data)
  mockQueryBuilder.select.mockImplementation(() => {
    // If this follows an insert, return the inserted data
    if (insertedData) {
      const result = insertedData;
      insertedData = null; // Reset for next operation
      
      const selectBuilder = { ...mockQueryBuilder };
      (selectBuilder as Record<string, jest.MockedFunction<(...args: unknown[]) => unknown>>).single = vi.fn().mockResolvedValue({ data: (result as unknown[])[0], error: null });
      (selectBuilder as Record<string, jest.MockedFunction<(...args: unknown[]) => unknown>>).then = (onFulfilled: (value: { data: unknown; error: null }) => unknown) => {
        return Promise.resolve({ data: result, error: null }).then(onFulfilled);
      };
      return selectBuilder;
    }

    // If this follows an upsert, return the upserted data
    if (upsertedData) {
      const result = upsertedData;
      upsertedData = null; // Reset for next operation
      
      const selectBuilder = { ...mockQueryBuilder };
      (selectBuilder as Record<string, jest.MockedFunction<(...args: unknown[]) => unknown>>).single = vi.fn().mockResolvedValue({ data: (result as unknown[])[0], error: null });
      (selectBuilder as Record<string, jest.MockedFunction<(...args: unknown[]) => unknown>>).then = (onFulfilled: (value: { data: unknown; error: null }) => unknown) => {
        return Promise.resolve({ data: result, error: null }).then(onFulfilled);
      };
      return selectBuilder;
    }
    
    const mockData = data[currentTable as keyof MockData] || [];
    
    // Create a new query builder that will resolve with data
    const selectBuilder = { ...mockQueryBuilder };
    
    // Override terminal methods for this select chain
    (selectBuilder as Record<string, jest.MockedFunction<(...args: unknown[]) => unknown>>).then = (onFulfilled: (value: { data: unknown; error: null }) => unknown) => {
      const filtered = applyFilters(mockData);
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled);
    };
    
    // Also handle direct awaiting
    Object.defineProperty(selectBuilder, Symbol.for('nodejs.util.inspect.custom'), {
      value: () => Promise.resolve({ data: applyFilters(mockData), error: null })
    });
    
    // Handle async/await pattern
    Object.defineProperty(selectBuilder, Symbol.toStringTag, {
      get() { return 'Promise'; }
    });
    
    // Make it thenable
    (selectBuilder as Record<string | symbol, jest.MockedFunction<(...args: unknown[]) => unknown>>)[Symbol.for('nodejs.util.promisify.custom')] = () => 
      Promise.resolve({ data: applyFilters(mockData), error: null });
    
    return selectBuilder;
  });

  const mockSupabase = {
    from: vi.fn((table: string) => {
      currentTable = table;
      currentFilters = [];
      return mockQueryBuilder;
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
        error: null,
      }),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.jpg' },
        }),
      }),
    },
  } as unknown as SupabaseClient<Database>;

  return mockSupabase;
}