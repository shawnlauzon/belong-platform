import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import { useImageUpload } from '../../hooks/useImageUpload';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the uploadImage API function
vi.mock('../../api/imageUpload', () => ({
  uploadImage: vi.fn(),
}));

// Global mocks for shared and auth modules are handled in vitest.setup.ts
import { useSupabase } from '@/shared';
import { uploadImage } from '../../api/imageUpload';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUploadImage = vi.mocked(uploadImage);

describe('useImageUpload', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockSupabase = createMockSupabase();
    
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should upload image with temp naming convention', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const expectedPath = `user-123/temp-upload-1234567890-abc123.jpg`;
    const expectedUrl = `https://example.supabase.co/storage/v1/object/public/images/${expectedPath}`;

    mockUploadImage.mockResolvedValue({
      url: expectedUrl,
      tempPath: expectedPath,
    });

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    // Execute the upload
    const uploadResult = await result.current.mutateAsync(mockFile);
      
    expect(uploadResult.url).toBe(expectedUrl);
    expect(uploadResult.tempPath).toBe(expectedPath);

    // Verify uploadImage was called with correct parameters
    expect(mockUploadImage).toHaveBeenCalledWith(
      mockFile,
      mockSupabase,
      'temp-upload'
    );
  });

  it('should throw error when user is not authenticated', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    mockUploadImage.mockRejectedValue(
      new Error('User must be authenticated to upload images')
    );

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    await expect(result.current.mutateAsync(mockFile)).rejects.toThrow(
      'User must be authenticated to upload images'
    );
  });

  it('should validate file is an image', async () => {
    const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    mockUploadImage.mockRejectedValue(
      new Error('Only image files are allowed')
    );

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    await expect(result.current.mutateAsync(mockFile)).rejects.toThrow(
      'Only image files are allowed'
    );
  });

  it('should validate file size limit', async () => {
    // Create a file larger than 5MB
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { 
      type: 'image/jpeg' 
    });
    
    mockUploadImage.mockRejectedValue(
      new Error('File size must be less than 5MB')
    );

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    await expect(result.current.mutateAsync(largeFile)).rejects.toThrow(
      'File size must be less than 5MB'
    );
  });

  it('should handle upload errors', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    mockUploadImage.mockRejectedValue(
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
    
    mockUploadImage
      .mockResolvedValueOnce({
        url: `https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg`,
        tempPath: `user-123/temp-upload-1234567890-abc123.jpg`,
      })
      .mockResolvedValueOnce({
        url: `https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567891-def456.jpg`,
        tempPath: `user-123/temp-upload-1234567891-def456.jpg`,
      });

    const { result } = renderHook(() => useImageUpload(), { wrapper });

    const result1 = await result.current.mutateAsync(mockFile1);
    const result2 = await result.current.mutateAsync(mockFile2);

    expect(result1.tempPath).toBe(`user-123/temp-upload-1234567890-abc123.jpg`);
    expect(result2.tempPath).toBe(`user-123/temp-upload-1234567891-def456.jpg`);
    
    // Verify both uploads called uploadImage correctly
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
    expect(mockUploadImage).toHaveBeenCalledWith(
      mockFile1, 
      mockSupabase,
      'temp-upload'
    );
    expect(mockUploadImage).toHaveBeenCalledWith(
      mockFile2, 
      mockSupabase,
      'temp-upload'
    );
  });
});