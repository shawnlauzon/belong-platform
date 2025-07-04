import { describe, it, expect } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { createMockResourceRow } from '../../__mocks__/';
import { fetchResources } from '@/features/resources/api/fetchResources';
import { faker } from '@faker-js/faker';

describe('fetchResources', () => {
  it('returns all resources when no filters provided', async () => {
    const mockRows = [
      createMockResourceRow(),
      createMockResourceRow(),
      createMockResourceRow(),
    ];
    const supabase = createMockSupabase({ resources: mockRows });

    // Debug: Check that from is called with 'resources'
    const result = await fetchResources(supabase);

    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(mockRows[0].id);
    expect(result[1].id).toBe(mockRows[1].id);
    expect(result[2].id).toBe(mockRows[2].id);
  });

  it('filters resources by community', async () => {
    const communityId = faker.string.uuid();
    const otherCommunityId = faker.string.uuid();
    const mockRows = [
      createMockResourceRow({ community_id: communityId }),
      createMockResourceRow({ community_id: otherCommunityId }),
      createMockResourceRow({ community_id: communityId }),
    ];
    const supabase = createMockSupabase({ resources: mockRows });

    const result = await fetchResources(supabase, { communityId });

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.communityId === communityId)).toBe(true);
  });

  it('returns empty array when no resources exist', async () => {
    const supabase = createMockSupabase({ resources: [] });

    const result = await fetchResources(supabase);

    expect(result).toEqual([]);
  });
});
