import { describe, it, expect } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { createMockResourceRow } from '../factories/resourceFactory';
import { fetchResourceById } from '@/features/resources/api/fetchResourceById';

describe('fetchResourceById', () => {
  it('returns ResourceInfo when resource exists', async () => {
    const mockRow = createMockResourceRow();
    const supabase = createMockSupabase({ resources: [mockRow] });
    
    const result = await fetchResourceById(supabase, mockRow.id);
    
    expect(result?.id).toBe(mockRow.id);
    expect(result?.ownerId).toBe(mockRow.owner_id);
    expect(result?.communityId).toBe(mockRow.community_id);
    expect(result?.title).toBe(mockRow.title);
    expect(result?.description).toBe(mockRow.description);
  });

  it('returns null when resource does not exist', async () => {
    const supabase = createMockSupabase({ resources: [] });
    
    const result = await fetchResourceById(supabase, 'non-existent-id');
    
    expect(result).toBeNull();
  });
});