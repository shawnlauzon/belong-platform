import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { StorageManager } from '@/shared/utils/storage';
import { useCurrentUser } from '@/features/auth';
import type { ImageUploadResult } from '../types';

/**
 * Hook for uploading images to temporary storage.
 *
 * Images are uploaded with a temporary naming convention: {userId}/temp-upload-{timestamp}-{random}.{ext}
 * These images can later be committed to permanent storage when associated with entities.
 * Temporary images older than 24 hours are automatically cleaned up.
 *
 * @returns React Query mutation result with upload function and state
 *
 * @example
 * ```tsx
 * function ImageUploader() {
 *   const { mutate: uploadImage, isLoading, error } = useImageUpload();
 *   const [selectedFile, setSelectedFile] = useState<File | null>(null);
 *
 *   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     const file = e.target.files?.[0];
 *     if (file) {
 *       setSelectedFile(file);
 *       uploadImage(file, {
 *         onSuccess: (result) => {
 *           console.log('Image uploaded:', result.url);
 *           // Use result.url in your form or store for later entity creation
 *         },
 *         onError: (error) => {
 *           console.error('Upload failed:', error);
 *         }
 *       });
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" accept="image/*" onChange={handleFileSelect} />
 *       {isLoading && <div>Uploading...</div>}
 *       {error && <div className="error">{error.message}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useImageUpload() {
  const supabase = useSupabase();
  const currentUser = useCurrentUser();

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<ImageUploadResult> => {
      if (!currentUser?.data?.id) {
        throw new Error('User must be authenticated to upload images');
      }

      // Validate file is an image
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }

      logger.debug('🖼️ Image Upload: Starting upload', {
        fileName: file.name,
        fileSize: file.size,
        userId: currentUser.data.id,
      });

      // Use temp-upload folder parameter for uploads - images will be migrated later
      const result = await StorageManager.uploadFile(file, supabase, 'temp-upload');

      logger.info('✅ Image Upload: Successfully uploaded to temp storage', {
        fileName: file.name,
        tempPath: result.path,
        url: result.url,
      });

      return {
        url: result.url,
        tempPath: result.path,
      };
    },
    onError: (error) => {
      logger.error('❌ Image Upload: Failed to upload image', { error });
    },
  });

  // Return mutation with stable function references
  return {
    ...mutation,
    mutate: useCallback(
      (...args: Parameters<typeof mutation.mutate>) => {
        return mutation.mutate(...args);
      },
      [mutation],
    ),
    mutateAsync: useCallback(
      (...args: Parameters<typeof mutation.mutateAsync>) => {
        return mutation.mutateAsync(...args);
      },
      [mutation],
    ),
  };
}