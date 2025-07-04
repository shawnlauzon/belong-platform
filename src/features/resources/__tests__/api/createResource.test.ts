import { describe, it, expect, vi } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { createMockResourceRow } from '../factories/resourceFactory';
import { createResource } from '@/features/resources/api/createResource';
import type { ResourceData } from '@/features/resources/types/domain';

describe('createResource', () => {
  it('creates resource and returns ResourceInfo', async () => {
    const mockRow = createMockResourceRow();
    const supabase = createMockSupabase({});
    
    // Mock the insert response
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({ data: mockRow, error: null });
    
    supabase.from = vi.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle
    });
    
    const resourceData: ResourceData = {
      type: 'offer',
      category: 'tools' as any,
      title: 'Test Resource',
      description: 'Test Description',
      communityId: 'test-community-id'
    };
    const ownerId = 'test-user-id';
    
    const result = await createResource(supabase, resourceData, ownerId);
    
    expect(result).not.toBeNull();
    expect(result?.id).toBe(mockRow.id);
    expect(result?.title).toBe(mockRow.title);
    expect(result?.ownerId).toBe(mockRow.owner_id);
  });
});