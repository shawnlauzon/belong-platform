import { describe, it, expect, vi } from 'vitest';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import {
  createMockResourceData,
  createMockResourceRow,
} from '../../__mocks__/';
import { createResource } from '@/features/resources/api/createResource';

describe('createResource', () => {
  it('creates resource and returns ResourceInfo', async () => {
    const mockRow = createMockResourceRow();
    const supabase = createMockSupabase({});

    // Mock the insert response
    const mockInsert = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnThis();
    const mockSingle = vi
      .fn()
      .mockResolvedValue({ data: mockRow, error: null });

    supabase.from = vi.fn().mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      single: mockSingle,
    });

    const resourceData = createMockResourceData();

    const result = await createResource(supabase, resourceData);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(mockRow.id);
    expect(result?.title).toBe(mockRow.title);
    expect(result?.ownerId).toBe(mockRow.owner_id);
  });
});
