# Belong Platform

A TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features.

## 🌟 Features

**For Community Members:**
- 🤝 **Resource Sharing** - Offer or request tools, skills, food, and supplies within your local community
- 📅 **Event Management** - Create and attend community gatherings and activities
- 💌 **Gratitude System** - Send thanks messages to community members who have helped
- 🏘️ **Geographic Communities** - Join hierarchical communities (neighborhood → city → state)
- 📱 **Activity Feeds** - Stay updated on community activity and connections

**For Developers:**
- 🎯 **Type-Safe** - Comprehensive TypeScript coverage prevents runtime errors
- 🗺️ **Location-Aware** - PostGIS integration for geographic features via Mapbox
- ⚡ **Real-Time Ready** - Built on Supabase with real-time subscription support
- 🧪 **Well-Tested** - Comprehensive test suite with 157+ passing tests
- 📦 **Modular** - Use packages independently or together

## 🏗️ Architecture

```
belong-platform/
├── @belongnetwork/core     # Configuration, clients, utilities
├── @belongnetwork/types    # TypeScript types and database schema  
└── @belongnetwork/api      # React Query hooks and data layer
```

## 🚀 Quick Start

### Installation

```bash
npm install @belongnetwork/api @belongnetwork/core @belongnetwork/types
# or
pnpm add @belongnetwork/api @belongnetwork/core @belongnetwork/types
```

### Basic Setup

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BelongClientProvider } from '@belongnetwork/api';

const queryClient = new QueryClient();

function App() {
  return (
    <BelongClientProvider
      config={{
        supabaseUrl: 'https://your-project.supabase.co',
        supabaseAnonKey: 'your-anon-key',
        mapboxPublicToken: 'your-mapbox-token',
        logLevel: 'info' // optional
      }}
    >
      <QueryClientProvider client={queryClient}>
        <YourApp />
      </QueryClientProvider>
    </BelongClientProvider>
  );
}
```

### Using the Hooks

```tsx
import { 
  useCommunities, 
  useResources, 
  useCurrentUser,
  useCreateResource 
} from '@belongnetwork/api';

function CommunityDashboard() {
  const { data: user } = useCurrentUser();
  const { data: communities } = useCommunities();
  const { data: resources } = useResources({ type: 'offer' });
  const createResource = useCreateResource();

  const handleShareResource = async () => {
    await createResource.mutateAsync({
      title: 'Power Drill',
      category: 'tools',
      type: 'offer',
      communityId: 'community-123',
      meetupType: 'pickup',
      // ... other fields
    });
  };

  return (
    <div>
      <h1>Welcome {user?.firstName}!</h1>
      
      <section>
        <h2>Your Communities</h2>
        {communities?.map(community => (
          <div key={community.id}>{community.name}</div>
        ))}
      </section>

      <section>
        <h2>Available Resources</h2>
        {resources?.map(resource => (
          <div key={resource.id}>
            <h3>{resource.title}</h3>
            <p>Offered by {resource.owner.firstName}</p>
          </div>
        ))}
      </section>

      <button onClick={handleShareResource}>
        Share a Resource
      </button>
    </div>
  );
}
```

## 📚 Package Documentation

### @belongnetwork/core

The foundation layer providing configured clients and utilities.

```tsx
import { createBelongClient } from '@belongnetwork/core';

// Create a configured client
const client = createBelongClient({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  mapboxPublicToken: 'your-mapbox-token'
});

// Access individual clients
const { supabase, mapbox, logger } = client;

// Use for custom operations
const { data } = await supabase.from('communities').select('*');
const addresses = await mapbox.searchAddresses('Austin, TX');
logger.info('Operation completed');
```

**Key Exports:**
- `createBelongClient()` - Main factory function
- `createSupabaseClient()` - Database client factory
- `createMapboxClient()` - Location services factory
- `StorageManager` - File upload handling
- All TypeScript types (re-exported from @belongnetwork/types)

### @belongnetwork/types

Centralized TypeScript definitions and database schema.

```tsx
import type { 
  User, 
  Community, 
  Resource, 
  Event, 
  ResourceFilter,
  CommunityData 
} from '@belongnetwork/types';

// Type-safe resource creation
const resourceData: ResourceData = {
  title: 'Garden Tools',
  category: 'tools',
  type: 'offer',
  communityId: 'community-123',
  meetupType: 'pickup'
};

// Type-safe filtering
const filter: ResourceFilter = {
  category: 'tools',
  type: 'offer',
  communityId: 'community-123'
};
```

**Key Types:**
- **Entities**: `User`, `Community`, `Resource`, `Event`, `Thanks`
- **Data Transfer**: `ResourceData`, `EventData`, etc.
- **Filters**: `ResourceFilter`, `EventFilter`, etc.
- **Activity**: `ActivityItem`, `ActivityType`

### @belongnetwork/api

React Query hooks for data access and state management.

#### Authentication
```tsx
import { useCurrentUser, useSignIn, useSignOut } from '@belongnetwork/api';

function AuthComponent() {
  const { data: user, isLoading } = useCurrentUser();
  const signIn = useSignIn();
  const signOut = useSignOut();

  if (isLoading) return <div>Loading...</div>;
  
  if (!user) {
    return (
      <button onClick={() => signIn.mutate({ email, password })}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      Welcome {user.firstName}!
      <button onClick={() => signOut.mutate()}>Sign Out</button>
    </div>
  );
}
```

#### Communities
```tsx
import { 
  useCommunities, 
  useCommunity, 
  useCreateCommunity,
  useJoinCommunity 
} from '@belongnetwork/api';

function CommunityManager() {
  const { data: communities } = useCommunities();
  const { data: community } = useCommunity('community-123');
  const createCommunity = useCreateCommunity();
  const joinCommunity = useJoinCommunity();

  // Create a new community
  const handleCreate = () => {
    createCommunity.mutate({
      name: 'Downtown Austin',
      level: 'neighborhood',
      parentId: 'austin-city'
    });
  };

  // Join an existing community
  const handleJoin = (communityId: string) => {
    joinCommunity.mutate({ communityId });
  };

  return (/* JSX */);
}
```

#### Resources
```tsx
import { 
  useResources, 
  useCreateResource, 
  useUpdateResource,
  useDeleteResource 
} from '@belongnetwork/api';

function ResourceManager() {
  const { data: resources } = useResources({
    type: 'offer',
    category: 'tools',
    communityId: 'community-123'
  });
  
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  const handleCreate = () => {
    createResource.mutate({
      title: 'Power Drill',
      description: 'Cordless drill with bits',
      category: 'tools',
      type: 'offer',
      communityId: 'community-123',
      meetupType: 'pickup',
      availableUntil: new Date('2024-12-31')
    });
  };

  return (/* JSX */);
}
```

#### Events
```tsx
import { 
  useEvents, 
  useCreateEvent, 
  useJoinEvent,
  useEventAttendees 
} from '@belongnetwork/api';

function EventManager() {
  const { data: events } = useEvents();
  const createEvent = useCreateEvent();
  const joinEvent = useJoinEvent();
  const { data: attendees } = useEventAttendees('event-123');

  const handleCreateEvent = () => {
    createEvent.mutate({
      title: 'Community Garden Workday',
      description: 'Help maintain our community garden',
      startTime: new Date('2024-07-15T10:00:00'),
      endTime: new Date('2024-07-15T14:00:00'),
      location: { lat: 30.2672, lng: -97.7431 },
      maxAttendees: 20,
      communityId: 'community-123'
    });
  };

  return (/* JSX */);
}
```

#### Activity Feeds
```tsx
import { useActivityFeed } from '@belongnetwork/api';

function ActivityFeed() {
  const { data: activities } = useActivityFeed({
    communityId: 'community-123',
    limit: 20
  });

  return (
    <div>
      {activities?.map(activity => (
        <div key={activity.id}>
          <h4>{activity.title}</h4>
          <p>{activity.description}</p>
          <small>{activity.timestamp.toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Supabase project
- Mapbox account

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-org/belong-platform.git
cd belong-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and Mapbox credentials

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Build packages
pnpm build

# Lint code
pnpm lint
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required for development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token

# Optional
VITE_LOG_LEVEL=debug
VITE_DEFAULT_LOCATION_LAT=30.2672
VITE_DEFAULT_LOCATION_LNG=-97.7431

# For database seeding
SUPABASE_SERVICE_KEY=your-service-key
SEED_MEMBER_ID=user-id-for-seeding
```

### Database Setup

The platform uses Supabase with PostGIS for geographic features:

```sql
-- Key tables (auto-managed by Supabase migrations)
- profiles              -- User profiles
- communities           -- Geographic hierarchy
- community_memberships -- User-community relationships  
- resources            -- Shared items/skills
- events               -- Community events
- event_attendances    -- RSVP tracking
- thanks              -- Gratitude messages
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @belongnetwork/api test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

## 🔧 Configuration Options

### BelongClientConfig

```typescript
interface BelongClientConfig {
  /** Supabase project URL */
  supabaseUrl: string;
  /** Supabase anonymous key */
  supabaseAnonKey: string;
  /** Mapbox public access token */
  mapboxPublicToken: string;
  /** Log level (default: 'info') */
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';
}
```

### React Query Configuration

```tsx
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

## 🔒 Security & Permissions

The platform uses Supabase Row Level Security (RLS) for data access control:

- **Authentication**: Email/password via Supabase Auth
- **Authorization**: Community-based access control
- **Data Privacy**: Users can only access data from their communities
- **Resource Sharing**: Owners control resource visibility and access

## 🌍 Geographic Features

Built-in location support via Mapbox and PostGIS:

- **Address Search**: Autocomplete address lookup
- **Distance Calculations**: Driving time between locations
- **Spatial Queries**: Find resources/events within geographic bounds
- **Community Boundaries**: Hierarchical geographic organization

## 📈 Performance

- **Efficient Queries**: Optimized database queries with proper indexing
- **Caching Strategy**: React Query for client-side caching
- **Bundle Size**: Tree-shakeable packages, minimal dependencies
- **Type Generation**: Build-time type checking prevents runtime errors

## 🤝 Contributing

### For Maintainers

```bash
# Development workflow
pnpm install          # Install dependencies
pnpm typecheck       # Type checking
pnpm test            # Run tests
pnpm lint            # Code linting
pnpm build           # Build packages

# Before committing
pnpm lint && pnpm typecheck && pnpm build
```

### Package Scripts

```bash
# Root level
pnpm test            # Run all tests
pnpm typecheck       # Check all packages
pnpm build          # Build all packages
pnpm lint           # Lint all packages

# Package level
pnpm --filter @belongnetwork/api test
pnpm --filter @belongnetwork/core build
```

### Adding New Features

1. **Types First**: Add types to `@belongnetwork/types`
2. **Implementation**: Add functions to `@belongnetwork/core` or `@belongnetwork/api`
3. **Tests**: Write comprehensive tests for new functionality
4. **Documentation**: Update README and JSDoc comments

## 📝 License

[Add your license here]

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/belong-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/belong-platform/discussions)
- **Documentation**: This README and inline JSDoc comments

---

Built with ❤️ for local communities everywhere.