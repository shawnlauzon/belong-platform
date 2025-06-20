# Belong Platform

A TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features.

```bash
npm install @belongnetwork/platform
```

## 🌟 Features

**For Community Members:**
- 🤝 **Resource Sharing** - Offer or request tools, skills, food, and supplies within your local community
- 📅 **Event Management** - Create and attend community gatherings and activities
- 💌 **Gratitude System** - Send thanks messages to community members who have helped
- 🏘️ **Geographic Communities** - Join hierarchical communities (neighborhood → city → state)
- 🔔 **Real-time Updates** - Stay connected with your community

**For Developers:**
- 🎯 **Type-Safe** - Comprehensive TypeScript coverage prevents runtime errors
- 🗺️ **Location-Aware** - PostGIS integration for geographic features via Mapbox
- ⚡ **Real-Time Ready** - Built on Supabase with real-time subscription support
- 🧪 **Well-Tested** - Comprehensive test suite with 157+ passing tests
- 📦 **Simple Setup** - One-time global initialization, then clean usage everywhere
- 🔧 **Easy Testing** - Mock global client instead of complex provider patterns

## 🏗️ Architecture

```
@belongnetwork/platform     # Single unified package
├── /hooks                  # All React Query hooks  
├── /types                  # TypeScript types and interfaces
├── BelongProvider          # React context provider
├── initializeBelong()      # Global initialization
└── useBelong()            # Primary hook for current user
```

### Authentication Architecture

The platform provides flexible authentication patterns to suit different use cases:

#### Two Usage Patterns

**1. Unified Context Pattern (Recommended)**
- Use `BelongProvider` + `useBelong()` for unified auth state across your app
- Provides current user data and auth mutations in one hook
- Automatic cache management and auth state synchronization

**2. Individual Hooks Pattern** 
- Use `useSignIn`, `useSignOut`, `useSignUp` hooks directly
- Works without `BelongProvider` - just needs `QueryClientProvider`
- Useful for login/signup forms before user is authenticated

#### Core Architecture

- **`useBelong()`**: Primary hook for current user data and auth mutations (requires `BelongProvider`)
- **`useAuth()`**: Advanced hook with full authentication state control
- **Individual Hooks**: `useSignIn`, `useSignOut`, `useSignUp` work independently  
- **`BelongProvider`**: React context provider managing centralized auth state
- **Service Layer**: Clean separation between auth services and React hooks
- **Single Source of Truth**: Unified caching prevents state inconsistencies

## 🚀 Quick Start

### Installation

```bash
npm install @belongnetwork/platform
# or
pnpm add @belongnetwork/platform
```

### Basic Setup

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeBelong, BelongProvider } from '@belongnetwork/platform';
import App from './App';

// Initialize the platform once at app startup
initializeBelong({
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BelongProvider>
        <App />
      </BelongProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

### Using the Hooks

```tsx
import { 
  useCommunities, 
  useResources, 
  useBelong,
  useCreateResource 
} from '@belongnetwork/platform';

function CommunityDashboard() {
  const { currentUser, isPending } = useBelong();
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

  if (isPending) return <div>Loading...</div>;
  if (!currentUser) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome {currentUser.firstName}!</h1>
      
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

### Key Setup Requirements

1. **Platform Initialization**: Call `initializeBelong()` once at app startup with your credentials
2. **QueryClientProvider**: Required for React Query functionality
3. **BelongProvider**: Required for accessing current user data  
4. **Provider nesting order**: QueryClient → Belong → App components
5. **Hook usage**: `useBelong()` must be called inside `BelongProvider`

### Quick Usage Pattern

```tsx
// Get current user data anywhere in your app (must be inside BelongProvider)
function UserNameDisplay() {
  const { currentUser } = useBelong();
  return <div>User: {currentUser?.firstName || 'Not signed in'}</div>;
}

// Handle loading and error states
function AuthStatus() {
  const { currentUser, isPending, isError } = useBelong();
  
  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error loading user</div>;
  
  return currentUser ? (
    <div>Welcome, {currentUser.firstName}!</div>
  ) : (
    <div>Please sign in</div>
  );
}
```

### Alternative Import Patterns

The package also supports subpath imports for better organization:

```tsx
// Import types separately  
import type { Resource, Community, User } from '@belongnetwork/platform/types';

// Import hooks separately
import { useResources, useCommunities } from '@belongnetwork/platform/hooks';
```

## 📚 Package Documentation

### Available Exports

The `@belongnetwork/platform` package provides two main categories of exports:

#### Providers

```tsx
import { initializeBelong, BelongProvider } from '@belongnetwork/platform';

// Initialize once at app startup
initializeBelong({
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
});

// Wrap your app with the BelongProvider
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider>
        {/* Your app components */}
      </BelongProvider>
    </QueryClientProvider>
  );
}
```

The `BelongProvider` manages current user state and should wrap your app components after global initialization.

#### Types

```tsx
import type { 
  User, 
  Community, 
  Resource, 
  Event, 
  ResourceFilter,
  CommunityData 
} from '@belongnetwork/platform/types';
// or
import type { User, Community } from '@belongnetwork/platform';

// Type-safe resource creation
const resourceData: ResourceData = {
  title: 'Garden Tools',
  category: 'tools',
  type: 'offer',
  communityId: 'community-123',
  meetupType: 'pickup'
};
```

**Key Types:**
- **Entities**: `User`, `Community`, `Resource`, `Event`, `Thanks`
- **Data Transfer**: `ResourceData`, `EventData`, etc.
- **Filters**: `ResourceFilter`, `EventFilter`, etc.
- **Geography**: `Coordinates`, `AddressSearchResult`

#### Hooks

All React Query hooks for data fetching and mutations:

#### Authentication

```tsx
import { useBelong, useSignIn, useSignOut, useAuth } from '@belongnetwork/platform';

function AuthComponent() {
  const { currentUser, isPending, isError, signIn, signOut } = useBelong();

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error loading user</div>;
  
  if (!currentUser) {
    return (
      <button onClick={() => signIn.mutateAsync({ email: 'test@example.com', password: 'password' })}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      Welcome {currentUser.firstName}!
      <button onClick={() => signOut.mutateAsync()}>Sign Out</button>
    </div>
  );
}

// Alternative: Use individual hooks outside BelongProvider
function IndividualHooksComponent() {
  const signIn = useSignIn();
  const signOut = useSignOut();
  
  return (
    <div>
      <button onClick={() => signIn.mutateAsync({ email: 'test@example.com', password: 'password' })}>
        Sign In
      </button>
      <button onClick={() => signOut.mutateAsync()}>Sign Out</button>
    </div>
  );
}

// For advanced auth control
function AdvancedAuthComponent() {
  const { 
    authUser, 
    currentUser, 
    signIn, 
    signUp, 
    signOut, 
    updateProfile 
  } = useAuth();
  
  // Full authentication state and mutations
  return (/* JSX */);
}
```

#### Communities
```tsx
import { 
  useCommunities, 
  useCommunity, 
  useCreateCommunity,
  useJoinCommunity 
} from '@belongnetwork/platform';

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
} from '@belongnetwork/platform';

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
} from '@belongnetwork/platform';

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

#### Thanks and Gratitude
```tsx
import { 
  useThanks, 
  useCreateThanks 
} from '@belongnetwork/platform';

function GratitudeManager() {
  const { data: thanksMessages } = useThanks({
    resourceId: 'resource-123'
  });
  const createThanks = useCreateThanks();

  const handleSendThanks = () => {
    createThanks.mutate({
      toUserId: 'user-456',
      resourceId: 'resource-123',
      message: 'Thank you for sharing this!'
    });
  };

  return (
    <div>
      <button onClick={handleSendThanks}>
        Send Thanks
      </button>
      
      {thanksMessages?.map(thanks => (
        <div key={thanks.id}>
          <p>"{thanks.message}"</p>
          <small>From {thanks.fromUser.firstName}</small>
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

#### Testing with Global Configuration

The new global configuration makes testing simpler. Here's how to set up tests:

```typescript
// test-setup.ts
import { beforeEach, vi } from 'vitest';
import { initializeBelong, resetBelongClient } from '@belongnetwork/platform';

// Mock the global client for unit tests
const mockGetBelongClient = vi.fn();
vi.mock('@belongnetwork/platform', () => ({
  getBelongClient: mockGetBelongClient,
  initializeBelong: vi.fn(),
  resetBelongClient: vi.fn(),
}));

beforeEach(() => {
  // Reset and configure mock client for each test
  mockGetBelongClient.mockReturnValue({
    supabase: {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      // ... other mocked methods
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    },
    mapbox: {
      searchAddresses: vi.fn(),
      // ... other mocked methods
    }
  });
});
```

For integration tests with real database, set up your environment variables and use the providers normally:

```typescript
// integration-test-setup.ts
import { initializeBelong, BelongProvider } from '@belongnetwork/platform';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Initialize once for integration tests
initializeBelong({
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
});

// For testing useBelong() - requires BelongProvider
export function BelongTestWrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider>
        {children}
      </BelongProvider>
    </QueryClientProvider>
  );
}

// For testing individual hooks - only needs QueryClient
export function BasicTestWrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

## 🔧 Configuration Options

### Platform Initialization

Initialize the platform once at app startup with your credentials:

```tsx
import { initializeBelong } from '@belongnetwork/platform';

initializeBelong({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  mapboxPublicToken: 'your-mapbox-token',
});
```

### Environment Variables

Set up your environment variables in `.env`:

```env
# Required for the platform to work
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token

# Optional
VITE_DEFAULT_LOCATION_LAT=30.2672
VITE_DEFAULT_LOCATION_LNG=-97.7431
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

1. **Types First**: Add types to `packages/types`
2. **Implementation**: Add hooks to `packages/api`
3. **Tests**: Write comprehensive tests for new functionality
4. **Documentation**: Update README and JSDoc comments
5. **Export**: Ensure new features are exported from the appropriate barrel files

## 📝 License

[Add your license here]

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/belong-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/belong-platform/discussions)
- **Documentation**: This README and inline JSDoc comments

---

Built with ❤️ for local communities everywhere.