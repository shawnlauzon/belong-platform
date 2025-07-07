import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { useImageCommit } from '../../hooks/useImageCommit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the commitImageUrls API function
vi.mock('../../api/imageCommit', () => ({
  commitImageUrls: vi.fn(),
}));

// Global mocks for shared and auth modules are handled in vitest.setup.ts
import { useSupabase } from '@/shared';
import { commitImageUrls } from '../../api/imageCommit';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCommitImageUrls = vi.mocked(commitImageUrls);

describe('useImageCommit', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should commit temporary image URLs to permanent storage', async () => {
    const tempUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567891-def456.jpg',
    ];

    const permanentUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/resource-res456-1234567890-abc123.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-123/resource-res456-1234567891-def456.jpg',
    ];

    mockCommitImageUrls.mockResolvedValue(permanentUrls);

    const { result } = renderHook(() => useImageCommit(), { wrapper });

    const commitResult = await result.current.mutateAsync({
      imageUrls: tempUrls,
      entityType: 'resource',
      entityId: 'res456',
    });

    expect(commitResult.permanentUrls).toEqual(permanentUrls);
    expect(commitResult.committedCount).toBe(2); // Both URLs were changed
    
    expect(mockCommitImageUrls).toHaveBeenCalledWith(
      tempUrls,
      'resource',
      'res456',
      mockSupabase
    );
  });

  it('should handle empty image URLs array', async () => {
    const { result } = renderHook(() => useImageCommit(), { wrapper });

    const commitResult = await result.current.mutateAsync({
      imageUrls: [],
      entityType: 'resource',
      entityId: 'res456',
    });

    expect(commitResult.permanentUrls).toEqual([]);
    expect(commitResult.committedCount).toBe(0);
    
    // Should not call the API function for empty arrays
    expect(mockCommitImageUrls).not.toHaveBeenCalled();
  });

  it('should handle mix of temporary and permanent URLs', async () => {
    const mixedUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg', // temp
      'https://example.supabase.co/storage/v1/object/public/images/user-456/resource-res456-photo2.jpg', // already permanent
    ];

    const resultUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/resource-res456-1234567890-abc123.jpg', // committed
      'https://example.supabase.co/storage/v1/object/public/images/user-456/resource-res456-photo2.jpg', // unchanged
    ];

    mockCommitImageUrls.mockResolvedValue(resultUrls);

    const { result } = renderHook(() => useImageCommit(), { wrapper });

    const commitResult = await result.current.mutateAsync({
      imageUrls: mixedUrls,
      entityType: 'resource',
      entityId: 'res456',
    });

    expect(commitResult.permanentUrls).toEqual(resultUrls);
    expect(commitResult.committedCount).toBe(1); // Only first URL was changed
    
    expect(mockCommitImageUrls).toHaveBeenCalledWith(
      mixedUrls,
      'resource',
      'res456',
      mockSupabase
    );
  });

  it('should handle API errors gracefully', async () => {
    const tempUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg',
    ];

    const error = new Error('Storage operation failed');
    mockCommitImageUrls.mockRejectedValue(error);

    const { result } = renderHook(() => useImageCommit(), { wrapper });

    await expect(
      result.current.mutateAsync({
        imageUrls: tempUrls,
        entityType: 'resource',
        entityId: 'res456',
      })
    ).rejects.toThrow('Storage operation failed');

    expect(mockCommitImageUrls).toHaveBeenCalledWith(
      tempUrls,
      'resource',
      'res456',
      mockSupabase
    );
  });

  it('should support different entity types', async () => {
    const tempUrl = 'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg';
    const permanentUrl = 'https://example.supabase.co/storage/v1/object/public/images/user-123/event-evt789-1234567890-abc123.jpg';

    mockCommitImageUrls.mockResolvedValue([permanentUrl]);

    const { result } = renderHook(() => useImageCommit(), { wrapper });

    const commitResult = await result.current.mutateAsync({
      imageUrls: [tempUrl],
      entityType: 'event',
      entityId: 'evt789',
    });

    expect(commitResult.permanentUrls).toEqual([permanentUrl]);
    expect(commitResult.committedCount).toBe(1);
    
    expect(mockCommitImageUrls).toHaveBeenCalledWith(
      [tempUrl],
      'event',
      'evt789',
      mockSupabase
    );
  });

  it('should provide stable function references', () => {
    const { result, rerender } = renderHook(() => useImageCommit(), { wrapper });

    const firstMutate = result.current.mutate;
    const firstMutateAsync = result.current.mutateAsync;

    rerender();

    const secondMutate = result.current.mutate;
    const secondMutateAsync = result.current.mutateAsync;

    // Function references should be stable across rerenders
    expect(firstMutate).toBe(secondMutate);
    expect(firstMutateAsync).toBe(secondMutateAsync);
  });

  it('should handle null or undefined imageUrls gracefully', async () => {
    const { result } = renderHook(() => useImageCommit(), { wrapper });

    const commitResult = await result.current.mutateAsync({
      imageUrls: [],
      entityType: 'user',
      entityId: 'user123',
    });

    expect(commitResult.permanentUrls).toEqual([]);
    expect(commitResult.committedCount).toBe(0);
    expect(mockCommitImageUrls).not.toHaveBeenCalled();
  });
});