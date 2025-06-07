import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, Upload, AlertCircle } from 'lucide-react';
import { StorageManager } from '@/lib/storage';
import { logger, logUserAction } from '@/lib/logger';

interface ImageUploadProps {
  onImagesUploaded: (urls: string[]) => void;
  maxImages?: number;
  existingImages?: string[];
  folder?: string;
}

export function ImageUpload({ 
  onImagesUploaded, 
  maxImages = 3, 
  existingImages = [],
  folder = 'uploads'
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Update images when existingImages prop changes
  React.useEffect(() => {
    if (existingImages.length > 0) {
      // Filter out any invalid URLs
      const validImages = existingImages.filter(url => url && url.trim() !== '');
      if (validImages.length > 0) {
        setImages(validImages);
        logger.debug('📷 ImageUpload: Set existing images:', { count: validImages.length });
      }
    }
  }, [existingImages]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length >= maxImages) return;
    if (isUploading) return;

    logger.debug('📷 ImageUpload: Files dropped:', { 
      fileCount: acceptedFiles.length, 
      currentImageCount: images.length,
      maxImages 
    });

    setUploadError(null);
    setIsUploading(true);

    try {
      // Process only up to the maximum allowed number of images
      const filesToProcess = acceptedFiles.slice(0, maxImages - images.length);

      logger.info('📷 ImageUpload: Starting upload process:', {
        filesToUpload: filesToProcess.length,
        fileNames: filesToProcess.map(f => f.name),
        folder
      });

      // Upload files to Supabase Storage
      const uploadResults = await StorageManager.uploadFiles(filesToProcess, folder);

      if (uploadResults.length === 0) {
        throw new Error('No files were uploaded successfully');
      }

      const newImageUrls = uploadResults.map(result => result.url);

      // Replace existing images with new ones (for single image uploads like avatars)
      const updatedImages = maxImages === 1 ? newImageUrls : [...images, ...newImageUrls];
      
      setImages(updatedImages);
      onImagesUploaded(updatedImages);
      
      logUserAction('images_uploaded_to_storage', {
        newImageCount: newImageUrls.length,
        totalImageCount: updatedImages.length,
        fileNames: filesToProcess.map(f => f.name),
        isReplacement: maxImages === 1,
        folder,
        urls: newImageUrls
      });

      logger.info('✅ ImageUpload: Images uploaded successfully to storage:', {
        newCount: newImageUrls.length,
        totalCount: updatedImages.length,
        isReplacement: maxImages === 1,
        urls: newImageUrls
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      logger.error('❌ ImageUpload: Upload failed:', error);
      
      setUploadError(errorMessage);
      logUserAction('image_upload_failed', {
        error: errorMessage,
        fileCount: acceptedFiles.length,
        folder
      });
    } finally {
      setIsUploading(false);
    }
  }, [images, maxImages, onImagesUploaded, folder, isUploading]);

  const removeImage = async (index: number) => {
    const updatedImages = [...images];
    const removedUrl = updatedImages[index];
    
    // Try to delete from storage if it's a Supabase URL
    try {
      const storagePath = StorageManager.extractPathFromUrl(removedUrl);
      if (storagePath) {
        logger.debug('🗑️ ImageUpload: Deleting image from storage:', { storagePath });
        await StorageManager.deleteFile(storagePath);
        logger.info('✅ ImageUpload: Image deleted from storage successfully');
      }
    } catch (error) {
      logger.warn('⚠️ ImageUpload: Failed to delete image from storage:', error);
      // Continue with removal from UI even if storage deletion fails
    }
    
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
    
    logUserAction('image_removed_from_storage', {
      removedIndex: index,
      remainingCount: updatedImages.length,
      removedUrl
    });
    
    logger.debug('📷 ImageUpload: Image removed:', {
      index,
      remainingCount: updatedImages.length
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: maxImages,
    disabled: images.length >= maxImages || isUploading
  });

  return (
    <div className="space-y-3">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}
          ${images.length >= maxImages || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Upload className="h-6 w-6 text-primary-500 animate-bounce" />
              <p className="text-sm text-primary-600 font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-warmgray-400" />
              {isDragActive ? (
                <p className="text-sm text-warmgray-600">Drop the images here...</p>
              ) : (
                <p className="text-sm text-warmgray-600">
                  {images.length >= maxImages 
                    ? `Maximum of ${maxImages} images reached` 
                    : maxImages === 1 
                      ? 'Drag & drop an image or click to select'
                      : `Drag & drop images or click to select (${images.length}/${maxImages})`}
                </p>
              )}
            </>
          )}
          <p className="text-xs text-warmgray-500">
            Supports JPEG, PNG, GIF, and WebP formats (max 5MB each)
          </p>
        </div>
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600">{uploadError}</p>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Image preview */}
      {images.length > 0 && (
        <div className={`grid gap-3 ${maxImages === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img 
                src={url} 
                alt={`Preview ${index + 1}`} 
                className={`w-full object-cover rounded-md ${maxImages === 1 ? 'h-32' : 'h-20'}`}
                onError={(e) => {
                  logger.warn('📷 ImageUpload: Image failed to load:', { url, index });
                  // Handle broken images gracefully
                  const target = e.target as HTMLImageElement;
                  target.style.opacity = '0.5';
                  target.alt = 'Failed to load image';
                }}
              />
              <button 
                type="button"
                onClick={() => removeImage(index)}
                disabled={isUploading}
                className="absolute top-1 right-1 bg-white bg-opacity-90 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5 text-warmgray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}