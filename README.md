# Belong Network Platform

A TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features.

```bash
pnpm add @belongnetwork/platform
# or
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
- 🧪 **Well-Tested** - Comprehensive test suite
- 📦 **Simple Setup** - Provider-based configuration with clean context access
- 🔧 **Easy Testing** - Clean provider wrapping for consistent test setups

## 🚀 Quick Start

### Basic Setup

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BelongProvider } from '@belongnetwork/platform';
import App from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BelongProvider
        config={{
          supabaseUrl: process.env.VITE_SUPABASE_URL!,
          supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
          mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
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
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAPBOX_PUBLIC_TOKEN=your-mapbox-token
```

### Your First Component

```tsx
import {
  useCurrentUser,
  useCommunities,
  useResources,
  useCreateResource,
  useSignIn,
  useSignOut,
} from '@belongnetwork/platform';

function CommunityDashboard() {
  const { data: currentUser, isLoading } = useCurrentUser();
  const { data: communities } = useCommunities();
  const { data: resources } = useResources({ type: 'offer' });
  const createResource = useCreateResource();
  const signIn = useSignIn();
  const signOut = useSignOut();

  if (isLoading) return <div>Loading...</div>;

  if (!currentUser) {
    return (
      <div>
        <h1>Welcome to Belong</h1>
        <button
          onClick={() =>
            signIn.mutateAsync({
              email: 'user@example.com',
              password: 'password',
            })
          }
        >
          Sign In
        </button>
      </div>
    );
  }

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
            <p>
              {resource.type} - {resource.category}
            </p>
          </div>
        ))}
      </section>

      <button onClick={() => signOut.mutateAsync()}>Sign Out</button>
    </div>
  );
}
```

## 📚 Core Concepts

### Provider Configuration

The `BelongProvider` manages authentication state and requires configuration:

```tsx
<BelongProvider
  config={{
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
  }}
>
  {/* Your app */}
</BelongProvider>
```

### Hook Architecture

The platform follows React best practices with single-purpose hooks:

- **Query Hooks** - Fetch data (`useCurrentUser`, `useCommunities`, `useResources`)
- **Mutation Hooks** - Modify data (`useCreateResource`, `useSignIn`, `useSignOut`)

Each hook has a single responsibility and returns properly typed data.

### Types

The platform exports comprehensive TypeScript types:

```tsx
import type {
  // Entities
  User,
  Community,
  Resource,
  Event,
  Message,
  Conversation,
  Shoutout,
  // Data Transfer Objects
  ResourceData,
  EventData,
  MessageData,
  ConversationData,
  ShoutoutData,
  // Filters
  ResourceFilter,
  EventFilter,
  MessageFilter,
  // Geography
  Coordinates,
  AddressSearchResult,
} from '@belongnetwork/platform';
```

## 🔧 API Reference

### Authentication

```tsx
import {
  useCurrentUser,
  useSignIn,
  useSignOut,
  useSignUp,
} from '@belongnetwork/platform';

// Get current user
const { data: currentUser, isLoading } = useCurrentUser();

// Sign in
const signIn = useSignIn();
await signIn.mutateAsync({ email, password });

// Sign up
const signUp = useSignUp();
await signUp.mutateAsync({ email, password, firstName, lastName });

// Sign out
const signOut = useSignOut();
await signOut.mutateAsync();
```

### Communities

```tsx
import {
  useCommunities,
  useCommunity,
  useCreateCommunity,
  useJoinCommunity,
  useLeaveCommunity,
} from '@belongnetwork/platform';

// List communities
const { data: communities } = useCommunities();

// Get single community
const { data: community } = useCommunity(communityId);

// Create community
const createCommunity = useCreateCommunity();
await createCommunity.mutateAsync({
  name: 'Downtown Austin',
  level: 'neighborhood',
  parentId: 'austin-city',
});
```

### Resources

```tsx
import {
  useResources,
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from '@belongnetwork/platform';

// List resources with filters
const { data: resources } = useResources({
  type: 'offer',
  category: 'tools',
  communityId: 'community-123',
});

// Create resource
const createResource = useCreateResource();
await createResource.mutateAsync({
  title: 'Power Drill',
  description: 'Cordless drill with bits',
  category: 'tools',
  type: 'offer',
  communityId: 'community-123',
  meetupType: 'pickup',
});
```

### Events

```tsx
import {
  useEvents,
  useEvent,
  useCreateEvent,
  useJoinEvent,
  useLeaveEvent,
} from '@belongnetwork/platform';

// List events
const { data: events } = useEvents();

// Create event
const createEvent = useCreateEvent();
await createEvent.mutateAsync({
  title: 'Community Garden Workday',
  description: 'Help maintain our community garden',
  startTime: new Date('2024-07-15T10:00:00'),
  endTime: new Date('2024-07-15T14:00:00'),
  location: { lat: 30.2672, lng: -97.7431 },
  maxAttendees: 20,
  communityId: 'community-123',
});
```

### Direct Messaging

```tsx
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
} from '@belongnetwork/platform';

// List conversations
const { data: conversations } = useConversations();

// Get messages in conversation
const { data: messages } = useMessages(conversationId);

// Send message
const sendMessage = useSendMessage();
await sendMessage.mutateAsync({
  conversationId,
  content: 'Hello!',
});
```

### Shoutouts

```tsx
import { useShoutouts, useCreateShoutout } from '@belongnetwork/platform';

// Get shoutouts for a resource
const { data: shoutouts } = useShoutouts({ resourceId });

// Send shoutout
const createShoutout = useCreateShoutout();
await createShoutout.mutateAsync({
  toUserId: 'user-456',
  resourceId: 'resource-123',
  message: 'Thank you for sharing this!',
});
```

## 🧪 Testing

The platform provides utilities for testing components that use Belong hooks:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BelongProvider } from '@belongnetwork/platform';

const testConfig = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  mapboxPublicToken: 'test-token',
};

export function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BelongProvider config={testConfig}>{children}</BelongProvider>
    </QueryClientProvider>
  );
}
```

## 📖 Documentation

- **[Usage Guide](./USAGE.md)** - Complete API documentation and examples
- **[Architecture](./ARCHITECTURE.md)** - Internal architecture and patterns
- **[Contributing](./CONTRIBUTING.md)** - Development guidelines

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

# Build package
pnpm build
```

## License

[Your License Here]

---

Built with ❤️ for local communities everywhere.
