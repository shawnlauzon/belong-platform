export type { EntityType } from '../api/imageCommit';

/**
 * Result from image upload operations
 */
export interface ImageUploadResult {
  /** Public URL of the uploaded image */
  url: string;
  /** Temporary storage path for the image */
  tempPath: string;
}