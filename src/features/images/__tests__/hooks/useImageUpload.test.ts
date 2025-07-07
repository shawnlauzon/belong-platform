import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { useImageUpload } from '../../hooks/useImageUpload';
import { createFakeUser } from '@/features/users/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';

// Mock the StorageManager
vi.mock('@/shared/utils/storage', () => ({
  StorageManager: {
    uploadFile: vi.fn(),
  },
}));

// Global mocks for shared and auth modules are handled in vitest.setup.ts
import { useSupabase } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { StorageManager } from '@/shared/utils/storage';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockStorageManager = StorageManager as any;

describe('useImageUpload', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let mockCurrentUser: User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockCurrentUser = createFakeUser();
    mockSupabase = createMockSupabase();
    
    mockUseSupabase.mockReturnValue(mockSupabase);
    mockUseCurrentUser.mockReturnValue({
      data: mockCurrentUser,
    } as ReturnType<typeof useCurrentUser>);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should upload image with temp naming convention', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const expectedPath = `${mockCurrentUser.id}/temp-upload-1234567890-abc123.jpg`;
    const expectedUrl = `https://example.supabase.co/storage/v1/object/public/images/${expectedPath}`;

    mockStorageManager.uploadFile.mockResolvedValue({
      url: expectedUrl,
      path: expectedPath,
    });

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    // Execute the upload
    const uploadResult = await result.current.mutateAsync(mockFile);
      
    expect(uploadResult.url).toBe(expectedUrl);
    expect(uploadResult.tempPath).toBe(expectedPath);

    // Verify StorageManager was called with temp-upload folder parameter
    expect(mockStorageManager.uploadFile).toHaveBeenCalledWith(
      mockFile,
      expect.any(Object), // Supabase client
      'temp-upload'
    );
  });

  it('should throw error when user is not authenticated', async () => {
    mockUseCurrentUser.mockReturnValue({ data: null });

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    await expect(result.current.mutateAsync(mockFile)).rejects.toThrow(
      'User must be authenticated to upload images'
    );
  });

  it('should validate file is an image', async () => {
    const { result } = renderHook(() => useImageUpload(), { wrapper });

    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    await expect(result.current.mutateAsync(mockFile)).rejects.toThrow(
      'Only image files are allowed'
    );
  });

  it('should validate file size limit', async () => {
    const { result } = renderHook(() => useImageUpload(), { wrapper });

    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    });

    await expect(result.current.mutateAsync(largeFile)).rejects.toThrow(
      'File size must be less than 5MB'
    );
  });

  it('should handle StorageManager upload errors', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    mockStorageManager.uploadFile.mockRejectedValue(
      new Error('Storage upload failed')
    );

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    await expect(result.current.mutateAsync(mockFile)).rejects.toThrow(
      'Storage upload failed'
    );
  });

  it('should generate unique temp paths for multiple uploads', async () => {
    const mockFile1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const mockFile2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    
    mockStorageManager.uploadFile
      .mockResolvedValueOnce({
        url: `https://example.supabase.co/storage/v1/object/public/images/${mockCurrentUser.id}/temp-upload-1234567890-abc123.jpg`,
        path: `${mockCurrentUser.id}/temp-upload-1234567890-abc123.jpg`,
      })
      .mockResolvedValueOnce({
        url: `https://example.supabase.co/storage/v1/object/public/images/${mockCurrentUser.id}/temp-upload-1234567891-def456.jpg`,
        path: `${mockCurrentUser.id}/temp-upload-1234567891-def456.jpg`,
      });

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    const result1 = await result.current.mutateAsync(mockFile1);
    const result2 = await result.current.mutateAsync(mockFile2);

    expect(result1.tempPath).toBe(`${mockCurrentUser.id}/temp-upload-1234567890-abc123.jpg`);
    expect(result2.tempPath).toBe(`${mockCurrentUser.id}/temp-upload-1234567891-def456.jpg`);
    
    // Verify both uploads called StorageManager correctly
    expect(mockStorageManager.uploadFile).toHaveBeenCalledTimes(2);
    expect(mockStorageManager.uploadFile).toHaveBeenCalledWith(
      mockFile1, 
      expect.any(Object), // Supabase client
      'temp-upload'
    );
    expect(mockStorageManager.uploadFile).toHaveBeenCalledWith(
      mockFile2, 
      expect.any(Object), // Supabase client
      'temp-upload'
    );
  });
});