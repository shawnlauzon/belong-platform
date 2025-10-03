# Shoutouts

Public appreciation posts within communities.

## Purpose

The shoutouts feature enables:
- Public recognition and appreciation between community members
- Linking shoutouts to specific resources (completed exchanges)
- Image attachments for visual context
- Commenting on shoutouts
- Community-wide visibility

## Key Entities

### Shoutout

Public appreciation post from one user to another.

**Key Fields:**
- `id` - Shoutout ID
- `message` - Appreciation message text
- `senderId` - User giving the shoutout
- `receiverId` - User receiving the shoutout
- `resourceId` - Related resource (offer/request/event)
- `imageUrls` - Optional images (array)
- `communityId` - Community where shoutout is posted
- `commentCount` - Number of comments
- `createdAt`, `updatedAt` - Timestamps

**Notes:**
- Always linked to a specific resource
- Posted within a specific community
- Public visibility to community members
- Supports multiple images

## Core Concepts

### Resource Context

Shoutouts are connected to resources:
- Typically created after completing an exchange
- References the offer, request, or event
- Provides context for the appreciation
- Links to resource page

### Community Visibility

Shoutouts are community-scoped:
- Posted within a specific community
- Visible to all community members
- Contributes to community culture
- Part of community feed

### Recognition Flow

1. Users complete a resource exchange
2. One party creates shoutout for the other
3. Shoutout appears in community feed
4. Other members can comment
5. Receiver gains trust points

### Commenting

Shoutouts support comments:
- Community members can comment
- Threading supported via comments feature
- Comments visible to all community members

## API Reference

### Hooks
- `useShoutouts(filter?)` - Query shoutouts with optional filters
- `useShoutout(id)` - Get single shoutout by ID
- `useCreateShoutout()` - Create new shoutout
- `useUpdateShoutout()` - Update shoutout
- `useDeleteShoutout()` - Delete shoutout

### Key Functions
- `fetchShoutouts(supabase, filter)` - Fetch shoutouts
- `fetchShoutoutById(supabase, id)` - Fetch single shoutout
- `createShoutout(supabase, input)` - Create shoutout
- `updateShoutout(supabase, id, updates)` - Update shoutout
- `deleteShoutout(supabase, id)` - Delete shoutout

## Important Patterns

### Creating Shoutouts

```typescript
const createShoutout = useCreateShoutout();

await createShoutout.mutateAsync({
  message: 'Thanks for the great conversation!',
  receiverId: 'receiver-user-id',
  resourceId: 'resource-id',
  communityId: 'community-id',
  imageUrls: ['https://...'] // optional
});
```

### Fetching Shoutouts

```typescript
// Get all shoutouts in a community
const { data: shoutouts } = useShoutouts({
  communityId: 'community-id'
});

// Get shoutouts received by a user
const { data: received } = useShoutouts({
  receiverId: 'user-id'
});

// Get shoutouts sent by a user
const { data: sent } = useShoutouts({
  senderId: 'user-id'
});

// Get shoutouts for a specific resource
const { data: resourceShoutouts } = useShoutouts({
  resourceId: 'resource-id'
});
```

### Updating Shoutouts

```typescript
const updateShoutout = useUpdateShoutout();

await updateShoutout.mutateAsync({
  id: 'shoutout-id',
  message: 'Updated message',
  imageUrls: ['https://new-image.jpg']
});
```

### Deleting Shoutouts

```typescript
const deleteShoutout = useDeleteShoutout();

await deleteShoutout.mutateAsync('shoutout-id');
```

### With Comments

```typescript
// Get shoutout with comment count
const { data: shoutout } = useShoutout(shoutoutId);
console.log(`${shoutout.commentCount} comments`);

// Fetch comments separately
const { data: comments } = useComments({
  shoutoutId: shoutoutId
});
```

### Image Handling

```typescript
// With images
await createShoutout.mutateAsync({
  message: 'Great experience!',
  receiverId: 'user-id',
  resourceId: 'resource-id',
  communityId: 'community-id',
  imageUrls: [
    'https://image1.jpg',
    'https://image2.jpg'
  ]
});

// Without images
await createShoutout.mutateAsync({
  message: 'Thanks!',
  receiverId: 'user-id',
  resourceId: 'resource-id',
  communityId: 'community-id'
  // imageUrls optional
});
```