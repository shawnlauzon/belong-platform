import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commitImageUrls } from '../../api/imageCommit';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the StorageManager
vi.mock('../../utils/storage', () => ({
  StorageManager: {
    extractPathFromUrl: vi.fn(),
  },
}));

import { StorageManager } from '../../utils/storage';
const mockStorageManager = StorageManager;

describe('commitImageUrls', () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  it('should commit temp URLs to permanent paths', async () => {
    const tempUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567891-def456.jpg',
    ];

    const tempPaths = [
      'user-123/temp-upload-1234567890-abc123.jpg',
      'user-123/temp-upload-1234567891-def456.jpg',
    ];

    const permanentPaths = [
      'user-123/resource-res456-1234567890-abc123.jpg',
      'user-123/resource-res456-1234567891-def456.jpg',
    ];

    const permanentUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/resource-res456-1234567890-abc123.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-123/resource-res456-1234567891-def456.jpg',
    ];

    // Mock path extraction
    mockStorageManager.extractPathFromUrl
      .mockReturnValueOnce(tempPaths[0])
      .mockReturnValueOnce(tempPaths[1]);

    // Mock storage operations
    const mockStorageFrom = vi.fn().mockReturnValue({
      move: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn()
        .mockReturnValueOnce({ data: { publicUrl: permanentUrls[0] } })
        .mockReturnValueOnce({ data: { publicUrl: permanentUrls[1] } }),
    });

    mockSupabase.storage = { from: mockStorageFrom };

    const result = await commitImageUrls({
      supabase: mockSupabase,
      imageUrls: tempUrls,
      entityType: 'resource',
      entityId: 'res456',
    });

    expect(result).toEqual(permanentUrls);

    // Verify move operations were called
    expect(mockStorageFrom).toHaveBeenCalledWith('images');
    expect(mockStorageFrom().move).toHaveBeenCalledTimes(2);
    expect(mockStorageFrom().move).toHaveBeenCalledWith(tempPaths[0], permanentPaths[0]);
    expect(mockStorageFrom().move).toHaveBeenCalledWith(tempPaths[1], permanentPaths[1]);
  });

  it('should handle permanent URLs by returning them unchanged', async () => {
    const permanentUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-456/resource-res456-photo1.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-123/user-user123-avatar.jpg',
    ];

    const permanentPaths = [
      'user-456/resource-res456-photo1.jpg',
      'user-123/user-user123-avatar.jpg',
    ];

    // Mock path extraction
    mockStorageManager.extractPathFromUrl
      .mockReturnValueOnce(permanentPaths[0])
      .mockReturnValueOnce(permanentPaths[1]);

    const result = await commitImageUrls({
      supabase: mockSupabase,
      imageUrls: permanentUrls,
      entityType: 'resource',
      entityId: 'res456',
    });

    // Should return unchanged since they're already permanent
    expect(result).toEqual(permanentUrls);

    // Should not have called any move operations
    expect(mockSupabase.storage.from).not.toHaveBeenCalled();
  });

  it('should handle mixed temp and permanent URLs', async () => {
    const mixedUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-456/resource-res456-photo2.jpg',
    ];

    const paths = [
      'user-123/temp-upload-1234567890-abc123.jpg',
      'user-456/resource-res456-photo2.jpg',
    ];

    const expectedResult = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/resource-res456-1234567890-abc123.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/user-456/resource-res456-photo2.jpg',
    ];

    // Mock path extraction
    mockStorageManager.extractPathFromUrl
      .mockReturnValueOnce(paths[0])
      .mockReturnValueOnce(paths[1]);

    // Mock storage operations
    const mockStorageFrom = vi.fn().mockReturnValue({
      move: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn()
        .mockReturnValueOnce({ data: { publicUrl: expectedResult[0] } }),
    });

    mockSupabase.storage = { from: mockStorageFrom };

    const result = await commitImageUrls({
      supabase: mockSupabase,
      imageUrls: mixedUrls,
      entityType: 'resource',
      entityId: 'res456',
    });

    expect(result).toEqual(expectedResult);

    // Should only move the temp file
    expect(mockStorageFrom().move).toHaveBeenCalledTimes(1);
    expect(mockStorageFrom().move).toHaveBeenCalledWith(
      'user-123/temp-upload-1234567890-abc123.jpg',
      'user-123/resource-res456-1234567890-abc123.jpg'
    );
  });

  it('should handle storage move errors gracefully', async () => {
    const tempUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg',
    ];

    mockStorageManager.extractPathFromUrl.mockReturnValue('user-123/temp-upload-1234567890-abc123.jpg');

    // Mock storage move failure
    const mockStorageFrom = vi.fn().mockReturnValue({
      move: vi.fn().mockResolvedValue({ 
        error: { message: 'File not found' } 
      }),
    });

    mockSupabase.storage = { from: mockStorageFrom };

    await expect(
      commitImageUrls({
        supabase: mockSupabase,
        imageUrls: tempUrls,
        entityType: 'resource',
        entityId: 'res456',
      })
    ).rejects.toThrow('Failed to commit image user-123/temp-upload-1234567890-abc123.jpg: File not found');
  });

  it('should handle invalid URLs gracefully', async () => {
    const invalidUrls = ['not-a-url', ''];

    mockStorageManager.extractPathFromUrl.mockReturnValue(null);

    const result = await commitImageUrls({
      supabase: mockSupabase,
      imageUrls: invalidUrls,
      entityType: 'resource',
      entityId: 'res456',
    });

    // Should filter out invalid URLs
    expect(result).toEqual([]);
  });

  it('should generate correct permanent paths for different entity types', async () => {
    const tempUrl = 'https://example.supabase.co/storage/v1/object/public/images/user-123/temp-upload-1234567890-abc123.jpg';
    const tempPath = 'user-123/temp-upload-1234567890-abc123.jpg';

    mockStorageManager.extractPathFromUrl.mockReturnValue(tempPath);

    const mockStorageFrom = vi.fn().mockReturnValue({
      move: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ 
        data: { publicUrl: 'https://example.com/migrated.jpg' } 
      }),
    });

    mockSupabase.storage = { from: mockStorageFrom };

    // Test different entity types
    await commitImageUrls({ supabase: mockSupabase, imageUrls: [tempUrl], entityType: 'resource', entityId: 'res123' });
    expect(mockStorageFrom().move).toHaveBeenCalledWith(tempPath, 'user-123/resource-res123-1234567890-abc123.jpg');

    await commitImageUrls({ supabase: mockSupabase, imageUrls: [tempUrl], entityType: 'event', entityId: 'evt456' });
    expect(mockStorageFrom().move).toHaveBeenCalledWith(tempPath, 'user-123/event-evt456-1234567890-abc123.jpg');

    await commitImageUrls({ supabase: mockSupabase, imageUrls: [tempUrl], entityType: 'community', entityId: 'com789' });
    expect(mockStorageFrom().move).toHaveBeenCalledWith(tempPath, 'user-123/community-com789-1234567890-abc123.jpg');

    await commitImageUrls({ supabase: mockSupabase, imageUrls: [tempUrl], entityType: 'user', entityId: 'usr000' });
    expect(mockStorageFrom().move).toHaveBeenCalledWith(tempPath, 'user-123/user-usr000-1234567890-abc123.jpg');
  });
});