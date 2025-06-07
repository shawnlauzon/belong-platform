import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';
import { logger, logUserAction } from '@/lib/logger';

interface ImageUploadProps {
  onImagesUploaded: (urls: string[]) => void;
  maxImages?: number;
  existingImages?: string[];
}

export function ImageUpload({ onImagesUploaded, maxImages = 3, existingImages = [] }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>([]);

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (images.length >= maxImages) return;

    logger.debug('📷 ImageUpload: Files dropped:', { 
      fileCount: acceptedFiles.length, 
      currentImageCount: images.length,
      maxImages 
    });

    // Process only up to the maximum allowed number of images
    const filesToProcess = acceptedFiles.slice(0, maxImages - images.length);

    // Create object URLs for preview
    // In a production app, you would upload these to Supabase Storage
    const newImageUrls = filesToProcess.map(file => {
      const objectUrl = URL.createObjectURL(file);
      
      logger.debug('📷 ImageUpload: Processing file:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        objectUrl
      });
      
      return objectUrl;
    });

    // Replace existing images with new ones (for single image uploads like avatars)
    const updatedImages = maxImages === 1 ? newImageUrls : [...images, ...newImageUrls];
    
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
    
    logUserAction('images_uploaded', {
      newImageCount: newImageUrls.length,
      totalImageCount: updatedImages.length,
      fileNames: filesToProcess.map(f => f.name),
      isReplacement: maxImages === 1
    });

    logger.info('📷 ImageUpload: Images uploaded successfully:', {
      newCount: newImageUrls.length,
      totalCount: updatedImages.length,
      isReplacement: maxImages === 1
    });

    // Clean up object URLs when component unmounts
    return () => {
      newImageUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [images, maxImages, onImagesUploaded]);

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    const removedUrl = updatedImages[index];
    
    // Revoke the object URL if it's a blob URL
    if (removedUrl && removedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(removedUrl);
    }
    
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
    
    logUserAction('image_removed', {
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
    disabled: images.length >= maxImages
  });

  return (
    <div className="space-y-3">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300'}
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
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
          <p className="text-xs text-warmgray-500">
            Supports JPEG, PNG, GIF, and WebP formats
          </p>
        </div>
      </div>
      
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
                className="absolute top-1 right-1 bg-white bg-opacity-90 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
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