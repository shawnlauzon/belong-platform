# Images

Image upload and storage for various entity types.

## Purpose

The images feature provides:
- Direct upload to Supabase Storage
- Temporary to permanent file migration
- Multi-entity support (resources, communities, users, shoutouts)
- Public URL generation
- Image cleanup on entity deletion

## Key Entities

### EntityType

Types of entities that can have images.

**Values:**
- `'resource'` - Resource images
- `'community'` - Community banners
- `'user'` - User avatars
- `'shoutout'` - Shoutout images

## Core Concepts

### Two-Phase Upload

Images use a two-phase approach:

**Phase 1: Temporary Upload**
- User selects image
- Uploads to temporary storage location
- Gets temporary URL
- URL used in forms

**Phase 2: Commit**
- Entity is created/updated
- Images moved from temporary to permanent storage
- URLs updated to permanent locations
- Temporary files cleaned up

### Storage Structure

Images organized by entity type:
```
storage/
  resources/{resourceId}/{filename}
  communities/{communityId}/{filename}
  users/{userId}/{filename}
  shoutouts/{shoutoutId}/{filename}
  temp/{sessionId}/{filename}
```

### Public URLs

All images have public URLs:
- Directly accessible
- CDN-backed
- No authentication required
- Cacheable

### Cleanup

Images are cleaned up automatically:
- When entity is deleted
- When temporary uploads expire
- When images are replaced

## API Reference

### Hooks
- `useUploadImage()` - Upload image to temporary storage
- `useCommitImages()` - Commit temporary images to permanent storage

### Key Functions
- `uploadImage(supabase, file)` - Upload to temporary storage
- `commitImageUrls(supabase, params)` - Move images to permanent storage
- `deleteEntityImages(supabase, entityType, entityId)` - Clean up entity images

## Important Patterns

### Uploading Images

```typescript
const uploadImage = useUploadImage();

async function handleFileSelect(file: File) {
  const result = await uploadImage.mutateAsync(file);
  // result contains temporary URL
  setImageUrl(result.url);
}
```

### Creating Entity with Images

```typescript
const createResource = useCreateResource();

// 1. Upload images first
const uploadedUrls = await Promise.all(
  files.map(file => uploadImage.mutateAsync(file))
);

// 2. Create entity with temporary URLs
const resource = await createResource.mutateAsync({
  title: 'My Resource',
  imageUrls: uploadedUrls.map(r => r.url)
});

// 3. Images automatically committed by API
// Temporary files moved to permanent location
```

### Manual Commit

```typescript
import { commitImageUrls } from '@/features/images';

await commitImageUrls({
  supabase,
  imageUrls: temporaryUrls,
  entityType: 'resource',
  entityId: resourceId
});
```

### Updating Images

```typescript
const updateResource = useUpdateResource();

// Upload new images
const newUrls = await Promise.all(
  newFiles.map(file => uploadImage.mutateAsync(file))
);

// Update with mix of old and new URLs
await updateResource.mutateAsync({
  id: resourceId,
  imageUrls: [
    ...existingUrls,  // Keep old images
    ...newUrls.map(r => r.url)  // Add new images
  ]
});
```

### Image Display

```typescript
function ImageGallery({ imageUrls }: { imageUrls: string[] }) {
  return (
    <div>
      {imageUrls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`Image ${index + 1}`}
          loading="lazy"
        />
      ))}
    </div>
  );
}
```

### File Validation

```typescript
function validateImage(file: File): boolean {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    throw new Error('File too large');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  return true;
}
```

### Upload Progress

```typescript
const uploadImage = useUploadImage();

function UploadButton({ file }: { file: File }) {
  if (uploadImage.isLoading) {
    return <Progress />;
  }

  return (
    <button onClick={() => uploadImage.mutate(file)}>
      Upload
    </button>
  );
}
```

### Error Handling

```typescript
const uploadImage = useUploadImage();

async function handleUpload(file: File) {
  try {
    const result = await uploadImage.mutateAsync(file);
    setImageUrl(result.url);
  } catch (error) {
    console.error('Upload failed:', error);
    // Show error to user
  }
}
```