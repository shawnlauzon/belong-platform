# Communities

Geographic and interest-based communities with spatial boundaries, membership management, and invitation system.

## Purpose

Communities enable users to:
- Create location-based neighborhoods with geographic boundaries (isochrone-based)
- Form interest-based groups around shared activities
- Manage membership with role-based permissions
- Control visibility of resources and activities within community scope

Communities are the primary organizational unit for resources, events, and social interactions on the platform.

## Key Entities

### Community

The main entity representing a geographic place or interest group.

**Key Fields:**
- `name` - Community name
- `type` - `'place'` | `'interest'`
- `icon` - Visual icon for the community
- `description` - Optional description
- `bannerImageUrl` - Banner image
- `center` - Required center point (Coordinates: lat/lng)
- `centerName` - Human-readable name for center location
- `boundary` - Optional geographic boundary (isochrone-based)
- `timeZone` - Time zone string (e.g., 'America/Los_Angeles')
- `color` - Hex color for visual customization
- `memberCount` - Number of members

**Notes:**
- Every community has a center point
- Place-based communities typically have geographic boundaries
- Interest-based communities may not have boundaries

### CommunityBoundary (Isochrone)

Geographic boundary based on travel time from center point.

**Key Fields:**
- `type` - Always `'isochrone'`
- `travelMode` - `'walking'` | `'cycling'` | `'driving'`
- `travelTimeMin` - Travel time in minutes (5-60)
- `polygon` - GeoJSON polygon from Mapbox API
- `areaSqKm` - Area in square kilometers

**Notes:**
- Uses Mapbox Isochrone API for boundary generation
- Represents reachable area within specified travel time
- Stored as PostGIS geometry in database

### CommunityMembership

User membership in a community with role.

**Key Fields:**
- `userId` - Member's user ID
- `communityId` - Community ID
- `role` - `'member'` | `'organizer'` | `'founder'`
- `createdAt` - When user joined
- `updatedAt` - Last updated

**Notes:**
- Composite primary key: (userId, communityId)
- Founder role assigned to community creator
- Organizers have elevated permissions

### CommunitySummary

Lightweight version for lists and maps.

**Includes:**
- `id`, `name`, `type`, `icon`
- `center`, `boundary`
- `color`, `memberCount`

## Core Concepts

### Community Types

**Place-Based Communities**
- Represent geographic neighborhoods or areas
- Have center point and optional isochrone boundary
- Resources visible to members within boundary
- Example: "Wallingford", "Capitol Hill"

**Interest-Based Communities**
- Organized around shared interests or activities
- May or may not have geographic boundaries
- Resources visible to all members regardless of location
- Example: "Book Club", "Urban Gardening"

### Membership Roles

**Member** (default)
- Can view community content
- Can create resources, events, comments
- Can claim resources

**Organizer**
- All member permissions
- Can manage community settings
- Can moderate content
- Can manage membership

**Founder**
- All organizer permissions
- Community creator
- Cannot leave community (must transfer or delete)

### Isochrone Boundaries

Communities can define boundaries using isochrones:
- **Travel Mode** - Walking, cycling, or driving
- **Travel Time** - 5 to 60 minutes from center
- **Dynamic** - Follows actual street networks and terrain
- **Accurate** - Uses Mapbox routing data

### Boundary Utilities

Helper functions for working with geographic boundaries:
- Check if point is within boundary
- Calculate distances
- Handle PostGIS geometry types
- Convert between GeoJSON and database formats

## API Reference

### Query Hooks
- `useCommunities(filter?)` - Get all communities with optional filter
- `useCommunity(id)` - Get single community by ID
- `useCommunityMembers(communityId)` - Get members of community
- `useUserCommunities(userId?)` - Get communities for user (defaults to current user)

### Mutation Hooks
- `useCreateCommunity()` - Create new community
- `useUpdateCommunity()` - Update community details
- `useDeleteCommunity()` - Delete community
- `useJoinCommunity()` - Join community
- `useJoinCommunityWithCode()` - Join using invitation code
- `useLeaveCommunity()` - Leave community

### Transformers
- `communityTransformer` - DB row → Community domain model
- Handles PostGIS geometry conversion
- Parses boundary JSON to typed objects

### Key Functions
- `fetchCommunities(supabase, filter?)` - Fetch communities
- `fetchCommunityById(supabase, id)` - Fetch single community
- `fetchCommunityMembers(supabase, communityId)` - Fetch members
- `createCommunity(supabase, input)` - Create community
- `joinCommunity(supabase, communityId)` - Join community
- `leaveCommunity(supabase, communityId)` - Leave community

## Important Patterns

### PostGIS Integration

Communities use PostGIS for spatial operations:
```typescript
// Boundary stored as PostGIS geometry
// Converted to/from GeoJSON in transformers
boundary: {
  type: 'isochrone',
  polygon: { type: 'Polygon', coordinates: [...] }
}
```

### Boundary Utilities

Use boundary utility functions for spatial operations:
```typescript
import { boundaryUtils } from '@/features/communities';

// Check if point is within boundary
const isInside = boundaryUtils.contains(community.boundary, userLocation);
```

### Membership Queries

Always fetch communities with membership information:
```typescript
// Includes memberCount automatically
const communities = useCommunities();

// Get specific community with role information
const { data: community } = useCommunity(id);
```

### Creating Communities

Center point is required; boundary is optional:
```typescript
createCommunity({
  name: "My Neighborhood",
  type: "place",
  center: { lat: 47.6062, lng: -122.3321 },
  centerName: "Seattle, WA",
  timeZone: "America/Los_Angeles",
  boundary: {
    type: 'isochrone',
    travelMode: 'walking',
    travelTimeMin: 15,
    polygon: // ... from Mapbox API
  }
});
```

### Role-Based Access

Check user role before allowing actions:
```typescript
const membership = useCommunityMembers(communityId);
const userRole = membership.find(m => m.userId === currentUser.id)?.role;

const canManage = userRole === 'organizer' || userRole === 'founder';
```

### Invitation Codes

Communities can be joined via invitation codes (see invitations feature):
```typescript
// Join using code
await joinCommunityWithCode({ code: 'ABC123' });
```