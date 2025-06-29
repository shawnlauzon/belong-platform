# Belong Platform

A TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features.

```bash
npm install @belongnetwork/platform
```

## 🌟 Features

**For Community Members:**

- 🤝 **Resource Sharing** - Offer or request tools, skills, food, and supplies within your local community
- 📅 **Event Management** - Create and attend community gatherings and activities
- 💬 **Direct Messaging** - Send private messages to other community members
- 💌 **Gratitude System** - Send shoutouts to community members who have helped
- 🏘️ **Geographic Communities** - Join hierarchical communities (neighborhood → city → state)
- 🔔 **Real-time Updates** - Stay connected with your community

**For Developers:**

- 🎯 **Type-Safe** - Comprehensive TypeScript coverage prevents runtime errors
- 🗺️ **Location-Aware** - PostGIS integration for geographic features via Mapbox
- ⚡ **Real-Time Ready** - Built on Supabase with real-time subscription support
- 🧪 **Well-Tested** - Comprehensive test suite with 468+ passing tests
- 📦 **Simple Setup** - Provider-based configuration with clean context access
- 🔧 **Easy Testing** - Clean provider wrapping for consistent test setups

## 🏗️ Architecture

```
@belongnetwork/platform     # Single unified package
├── /hooks                  # All React Query hooks
├── /types                  # TypeScript types and interfaces
├── BelongProvider          # React context provider with config
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
- Now requires `BelongProvider` for configuration access
- Useful for focused authentication components within the provider

#### Core Architecture

- **`useBelong()`**: Primary hook for current user data and auth mutations (requires `BelongProvider`)
- **`useAuth()`**: Advanced hook with full authentication state control
- **Individual Hooks**: `useSignIn`, `useSignOut`, `useSignUp` require `BelongProvider` context
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
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BelongProvider } from "@belongnetwork/platform";
import App from "./App";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BelongProvider
        config={{
          supabaseUrl: process.env.REACT_APP_SUPABASE_URL!,
          supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY!,
          mapboxPublicToken: process.env.REACT_APP_MAPBOX_PUBLIC_TOKEN!,
        }}
      >
        <App />
      </BelongProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

### Environment Variables

Create a `.env` file:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_MAPBOX_PUBLIC_TOKEN=your-mapbox-token
```

### Your First Component

```tsx
import {
  useCommunities,
  useResources,
  useBelong,
  useCreateResource,
  useConversations,
  useSendMessage,
} from "@belongnetwork/platform";

function CommunityDashboard() {
  const { currentUser, isPending } = useBelong();
  const { data: communities } = useCommunities();
  const { data: resources } = useResources({ type: "offer" });
  const { data: conversations } = useConversations();
  const createResource = useCreateResource();
  const sendMessage = useSendMessage();

  const handleSendMessage = async (conversationId: string, content: string) => {
    await sendMessage.mutateAsync({
      conversationId,
      content,
    });
  };

  if (isPending) return <div>Loading...</div>;
  if (!currentUser) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome {currentUser.firstName}!</h1>

      <section>
        <h2>Your Communities</h2>
        {communities?.map((community) => (
          <div key={community.id}>{community.name}</div>
        ))}
      </section>

      <section>
        <h2>Available Resources</h2>
        {resources?.map((resource) => (
          <div key={resource.id}>
            <h3>{resource.title}</h3>
            <p>Offered by {resource.owner.firstName}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Messages</h2>
        {conversations?.map((conversation) => (
          <div key={conversation.id}>
            <p>Conversation with participants</p>
            <p>Last message: {conversation.lastMessagePreview}</p>
            <p>Unread: {conversation.unreadCount}</p>
          </div>
        ))}
      </section>

      <button onClick={handleShareResource}>Share a Resource</button>
    </div>
  );
}
```

### Key Setup Requirements

1. **BelongProvider Configuration**: Pass configuration as `config` prop to `BelongProvider`
2. **QueryClientProvider**: Required for React Query functionality
3. **Provider nesting order**: QueryClient → Belong → App components
4. **Hook usage**: `useBelong()` must be called inside `BelongProvider`
5. **Individual hooks**: `useSignIn`, `useSignOut`, `useSignUp` now require `BelongProvider` context

### Quick Usage Pattern

```tsx
// Get current user data anywhere in your app (must be inside BelongProvider)
function UserNameDisplay() {
  const { currentUser } = useBelong();
  return <div>User: {currentUser?.firstName || "Not signed in"}</div>;
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
import type { Resource, Community, User } from "@belongnetwork/platform/types";

// Import hooks separately
import { useResources, useCommunities } from "@belongnetwork/platform/hooks";
```

## 📚 Package Documentation

### Available Exports

The `@belongnetwork/platform` package provides two main categories of exports:

#### Providers

```tsx
import { BelongProvider } from "@belongnetwork/platform";

// Wrap your app with the BelongProvider and pass configuration
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider
        config={{
          supabaseUrl: process.env.REACT_APP_SUPABASE_URL!,
          supabaseAnonKey: process.env.REACT_APP_SUPABASE_ANON_KEY!,
          mapboxPublicToken: process.env.REACT_APP_MAPBOX_PUBLIC_TOKEN!,
        }}
      >
        {/* Your app components */}
      </BelongProvider>
    </QueryClientProvider>
  );
}
```

The `BelongProvider` manages current user state and requires configuration to be passed as a prop.

#### Types

```tsx
import type {
  User,
  Community,
  Resource,
  Event,
  Message,
  Conversation,
  ResourceFilter,
  CommunityData,
  MessageData,
  ConversationData,
} from "@belongnetwork/platform/types";
// or
import type { User, Community } from "@belongnetwork/platform";

// Type-safe resource creation
const resourceData: ResourceData = {
  title: "Garden Tools",
  category: "tools",
  type: "offer",
  communityId: "community-123",
  meetupType: "pickup",
};
```

**Key Types:**

- **Entities**: `User`, `Community`, `Resource`, `Event`, `Shoutout`, `Message`, `Conversation`
- **Data Transfer**: `ResourceData`, `EventData`, `MessageData`, `ConversationData`, etc.
- **Filters**: `ResourceFilter`, `EventFilter`, `MessageFilter`, `ConversationFilter`, etc.
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

// Alternative: Use individual hooks within BelongProvider context
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

#### Shoutouts and Gratitude

```tsx
import { useShoutouts, useCreateShoutout } from "@belongnetwork/platform";

function GratitudeManager() {
  const { data: shoutoutMessages } = useShoutouts({
    resourceId: "resource-123",
  });
  const createShoutout = useCreateShoutout();

  const handleSendShoutout = () => {
    createShoutout.mutate({
      toUserId: "user-456",
      resourceId: "resource-123",
      message: "Thank you for sharing this!",
    });
  };

  return (
    <div>
      <button onClick={handleSendShoutout}>Send Shoutout</button>

      {shoutoutMessages?.map((shoutout) => (
        <div key={shoutout.id}>
          <p>"{shoutout.message}"</p>
          <small>From {shoutout.fromUser.firstName}</small>
        </div>
      ))}
    </div>
  );
}
```

#### Direct Messaging

```tsx
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
} from "@belongnetwork/platform";

function MessagingInterface() {
  const { data: conversations } = useConversations();
  const { data: messages } = useMessages("conversation-123");
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  const handleSendMessage = (conversationId: string, content: string) => {
    sendMessage.mutate({
      conversationId,
      content,
    });
  };

  const handleMarkAsRead = (conversationId: string) => {
    markAsRead.mutate({ conversationId });
  };

  return (
    <div>
      <section>
        <h3>Conversations</h3>
        {conversations?.map((conversation) => (
          <div key={conversation.id}>
            <p>Last message: {conversation.lastMessagePreview}</p>
            <span>Unread: {conversation.unreadCount}</span>
            <button onClick={() => handleMarkAsRead(conversation.id)}>
              Mark as Read
            </button>
          </div>
        ))}
      </section>

      <section>
        <h3>Messages</h3>
        {messages?.map((message) => (
          <div key={message.id}>
            <p>{message.content}</p>
            <small>
              From: {message.fromUser?.firstName}
              {message.readAt ? " (Read)" : " (Unread)"}
            </small>
          </div>
        ))}
      </section>

      <button onClick={() => handleSendMessage("conversation-123", "Hello!")}>
        Send Message
      </button>
    </div>
  );
}
```

## Documentation

- **[Usage Guide](./USAGE.md)** - Complete API documentation, hooks reference, and examples
- **[Architecture](./ARCHITECTURE.md)** - Internal architecture, development guidelines, and contributing

## Requirements

- Node.js 18+
- React 18+
- TypeScript 5+
- Supabase account
- Mapbox account (for location features)

## Development

```bash
# Clone and install
git clone https://github.com/belongnetwork/belong-platform.git
cd belong-platform
pnpm install

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Build packages
pnpm build
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
- shoutouts           -- Gratitude messages
- conversations       -- Direct message conversations
- direct_messages     -- Private messages between users
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

#### Testing with BelongProvider

Testing requires wrapping components with `BelongProvider` and configuration. Here's how to set up tests:

```typescript
// test-setup.ts
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BelongProvider } from '@belongnetwork/platform';

// For unit tests, you can mock Supabase client methods
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  // ... other mocked methods
};

// Mock configuration for unit tests
const testConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  mapboxPublicToken: 'test-token'
};

// Test wrapper component
export function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider config={testConfig}>
        {children}
      </BelongProvider>
    </QueryClientProvider>
  );
}
```

For integration tests with real database, set up your environment variables and use the providers with real configuration:

```typescript
// integration-test-setup.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BelongProvider } from '@belongnetwork/platform';

// Real configuration for integration tests
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
};

export function IntegrationTestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider config={config}>
        {children}
      </BelongProvider>
    </QueryClientProvider>
  );
}

// All hooks require BelongProvider context
export const TestWrapper = IntegrationTestWrapper;
```

## 🔧 Configuration Options

### Provider Configuration

Configure the platform by passing config to `BelongProvider`:

```tsx
import { BelongProvider } from "@belongnetwork/platform";

<BelongProvider
  config={{
    supabaseUrl: "https://your-project.supabase.co",
    supabaseAnonKey: "your-anon-key",
    mapboxPublicToken: "your-mapbox-token",
  }}
>
  <YourApp />
</BelongProvider>;
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
import { QueryClient } from "@tanstack/react-query";

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

## License

[Add your license here]

---

Built with ❤️ for local communities everywhere.