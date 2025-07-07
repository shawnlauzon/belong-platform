import { useMutation } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { uploadImage } from '../api/imageUpload';
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

  const mutation = useMutation({
    mutationFn: async (file: File): Promise<ImageUploadResult> => {
      return uploadImage(file, supabase, 'temp-upload');
    },
  });

  return mutation;
}