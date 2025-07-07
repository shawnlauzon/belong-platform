import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageCleanupService } from '../imageCleanup';
import { createMockSupabase } from '@/test-utils/supabase-mocks';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('ImageCleanupService', () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
  });

  describe('cleanupTempImages', () => {
    it('should clean up old temp images', async () => {
      // Mock old temp files
      const oldTempFile = {
        name: 'temp/user-123/old-image.jpg',
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };

      const recentTempFile = {
        name: 'temp/user-123/recent-image.jpg',
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      };

      const permanentFile = {
        name: 'resource-123-image.jpg',
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };

      // Mock storage list response
      const mockStorageList = vi.fn().mockResolvedValue({
        data: [oldTempFile, recentTempFile, permanentFile],
        error: null
      });

      const mockStorageRemove = vi.fn().mockResolvedValue({
        error: null
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
          remove: mockStorageRemove,
        })
      } as any;

      const cleanedCount = await ImageCleanupService.cleanupTempImages(mockSupabase, 24);

      expect(cleanedCount).toBe(1);
      expect(mockStorageRemove).toHaveBeenCalledWith(['temp/user-123/old-image.jpg']);
    });

    it('should handle empty storage bucket', async () => {
      const mockStorageList = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
        })
      } as any;

      const cleanedCount = await ImageCleanupService.cleanupTempImages(mockSupabase);

      expect(cleanedCount).toBe(0);
    });

    it('should handle storage list errors', async () => {
      const mockStorageList = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Access denied' }
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
        })
      } as any;

      await expect(ImageCleanupService.cleanupTempImages(mockSupabase))
        .rejects.toThrow('Failed to list images: Access denied');
    });
  });

  describe('cleanupEntityImages', () => {
    it('should clean up images for a specific entity', async () => {
      const entityFiles = [
        { name: 'resource-res123-photo1.jpg' },
        { name: 'resource-res123-photo2.jpg' },
        { name: 'resource-res456-photo1.jpg' }, // Different entity
        { name: 'event-evt123-photo1.jpg' }, // Different type
      ];

      const mockStorageList = vi.fn().mockResolvedValue({
        data: entityFiles,
        error: null
      });

      const mockStorageRemove = vi.fn().mockResolvedValue({
        error: null
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
          remove: mockStorageRemove,
        })
      } as any;

      const cleanedCount = await ImageCleanupService.cleanupEntityImages(
        mockSupabase, 
        'resource', 
        'res123'
      );

      expect(cleanedCount).toBe(2);
      expect(mockStorageRemove).toHaveBeenCalledWith([
        'resource-res123-photo1.jpg',
        'resource-res123-photo2.jpg'
      ]);
    });

    it('should handle no matching entity images', async () => {
      const mockStorageList = vi.fn().mockResolvedValue({
        data: [
          { name: 'resource-different-photo1.jpg' },
          { name: 'event-evt123-photo1.jpg' },
        ],
        error: null
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
        })
      } as any;

      const cleanedCount = await ImageCleanupService.cleanupEntityImages(
        mockSupabase, 
        'resource', 
        'res123'
      );

      expect(cleanedCount).toBe(0);
    });
  });

  describe('findOrphanedImages', () => {
    it('should find orphaned images in dry run mode', async () => {
      const files = [
        { name: 'resource-res123-photo1.jpg' },
        { name: 'resource-res456-photo1.jpg' },
        { name: 'temp/user-123/temp.jpg' }, // Should be ignored
      ];

      const mockStorageList = vi.fn().mockResolvedValue({
        data: files,
        error: null
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
        })
      } as any;

      // Mock that res123 exists but res456 doesn't
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'res123' } })
          })
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null })
          })
        });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: mockSelect
      });

      const orphanedFiles = await ImageCleanupService.findOrphanedImages(mockSupabase, true);

      expect(orphanedFiles).toEqual(['resource-res456-photo1.jpg']);
    });

    it('should delete orphaned images when not in dry run mode', async () => {
      const files = [
        { name: 'resource-res456-photo1.jpg' },
      ];

      const mockStorageList = vi.fn().mockResolvedValue({
        data: files,
        error: null
      });

      const mockStorageRemove = vi.fn().mockResolvedValue({
        error: null
      });

      mockSupabase.storage = {
        from: vi.fn().mockReturnValue({
          list: mockStorageList,
          remove: mockStorageRemove,
        })
      } as any;

      // Mock that res456 doesn't exist
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null })
          })
        })
      });

      const orphanedFiles = await ImageCleanupService.findOrphanedImages(mockSupabase, false);

      expect(orphanedFiles).toEqual(['resource-res456-photo1.jpg']);
      expect(mockStorageRemove).toHaveBeenCalledWith(['resource-res456-photo1.jpg']);
    });
  });
});