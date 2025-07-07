import { useMutation } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { commitImageUrls, type EntityType } from '../api/imageCommit';

/**
 * Input parameters for committing image URLs
 */
export interface ImageCommitInput {
  /** Array of image URLs to commit */
  imageUrls: string[];
  /** Type of entity the images belong to */
  entityType: EntityType;
  /** ID of the entity the images belong to */
  entityId: string;
}

/**
 * Result of committing image URLs
 */
export interface ImageCommitResult {
  /** Array of permanent image URLs */
  permanentUrls: string[];
  /** Number of URLs that were committed (vs already permanent) */
  committedCount: number;
}

/**
 * Hook for committing temporary image URLs to permanent storage locations.
 *
 * This hook wraps the commitImageUrls API function in a React Query mutation,
 * providing proper error handling, loading states, and stable function references.
 * 
 * The hook identifies temporary URLs (containing "temp-upload-" in filename) and
 * moves them to permanent paths using entity type and ID. Already-permanent URLs
 * are returned unchanged.
 *
 * @returns React Query mutation result with commit function and state
 *
 * @example
 * ```tsx
 * function ResourceForm() {
 *   const { mutate: commitImages, isLoading, error } = useImageCommit();
 *   const [tempImageUrls, setTempImageUrls] = useState<string[]>([]);
 *
 *   const handleSubmit = async (resourceData: ResourceData) => {
 *     try {
 *       // Commit temporary images before saving resource
 *       const { permanentUrls } = await commitImages.mutateAsync({
 *         imageUrls: tempImageUrls,
 *         entityType: 'resource',
 *         entityId: 'resource-123'
 *       });
 *       
 *       // Save resource with permanent URLs
 *       await saveResource({
 *         ...resourceData,
 *         imageUrls: permanentUrls
 *       });
 *     } catch (error) {
 *       console.error('Failed to commit images:', error);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {isLoading && <div>Committing images...</div>}
 *       {error && <div className="error">{error.message}</div>}
 *       // form fields
 *     </form>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using within another mutation hook
 * function useCreateResource() {
 *   const commitImages = useImageCommit();
 *   
 *   return useMutation({
 *     mutationFn: async (resourceData: CreateResourceInput) => {
 *       // Commit images first if any temp URLs
 *       let finalImageUrls = resourceData.imageUrls;
 *       if (resourceData.imageUrls?.length > 0) {
 *         const { permanentUrls } = await commitImages.mutateAsync({
 *           imageUrls: resourceData.imageUrls,
 *           entityType: 'resource',
 *           entityId: resourceData.id
 *         });
 *         finalImageUrls = permanentUrls;
 *       }
 *       
 *       return createResource({
 *         ...resourceData,
 *         imageUrls: finalImageUrls
 *       });
 *     }
 *   });
 * }
 * ```
 */
export function useImageCommit() {
  const supabase = useSupabase();

  const mutation = useMutation({
    mutationFn: async ({ imageUrls, entityType, entityId }: ImageCommitInput): Promise<ImageCommitResult> => {
      if (!imageUrls || imageUrls.length === 0) {
        return {
          permanentUrls: [],
          committedCount: 0,
        };
      }

      logger.debug('🖼️ Image Commit Hook: Starting commit', {
        urlCount: imageUrls.length,
        entityType,
        entityId,
      });

      const permanentUrls = await commitImageUrls(
        imageUrls,
        entityType,
        entityId,
        supabase
      );

      // Count how many URLs were actually committed (changed from temp to permanent)
      const committedCount = imageUrls.filter((originalUrl, index) => 
        originalUrl !== permanentUrls[index]
      ).length;

      logger.info('✅ Image Commit Hook: Successfully committed images', {
        originalCount: imageUrls.length,
        permanentCount: permanentUrls.length,
        committedCount,
        entityType,
        entityId,
      });

      return {
        permanentUrls,
        committedCount,
      };
    },
    onError: (error) => {
      logger.error('❌ Image Commit Hook: Failed to commit images', { error });
    },
  });

  // React Query mutations already provide stable function references
  return mutation;
}