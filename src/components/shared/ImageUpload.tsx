import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  onImagesUploaded: (urls: string[]) => void;
  maxImages?: number;
}

// In a real implementation, this would upload to Supabase Storage
// For the MVP, we'll use local state and sample images
export function ImageUpload({ onImagesUploaded, maxImages = 3 }: ImageUploadProps) {
  const [images, setImages] = useState<string[]>([]);

  // Placeholder image URLs (in a real app, we would upload to storage)
  const sampleImageUrls = [
    'https://images.pexels.com/photos/4117524/pexels-photo-4117524.jpeg',
    'https://images.pexels.com/photos/8186421/pexels-photo-8186421.jpeg',
    'https://images.pexels.com/photos/3943882/pexels-photo-3943882.jpeg',
    'https://images.pexels.com/photos/6647120/pexels-photo-6647120.jpeg',
    'https://images.pexels.com/photos/4226891/pexels-photo-4226891.jpeg'
  ];
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (images.length >= maxImages) return;
    
    const newImages = acceptedFiles.slice(0, maxImages - images.length).map(() => {
      // Get a random image from our sample URLs
      return sampleImageUrls[Math.floor(Math.random() * sampleImageUrls.length)];
    });
    
    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
  }, [images, maxImages, onImagesUploaded]);

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: maxImages,
    disabled: images.length >= maxImages
  });

  return (
    <div className="space-y-3">
      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-md p-6 text-center cursor-pointer
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
                : `Drag & drop images or click to select (${images.length}/${maxImages})`}
            </p>
          )}
        </div>
      </div>
      
      {/* Image preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img 
                src={url} 
                alt={`Preview ${index}`} 
                className="w-full h-20 object-cover rounded-md" 
              />
              <button 
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-white bg-opacity-90 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
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