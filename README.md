# Belong Platform

A TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features.

## Quick Start

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
import { useAuth, useCommunities } from "@belongnetwork/platform";

function CommunityList() {
  const { currentUser, isAuthenticated } = useAuth();
  const { communities, isLoading } = useCommunities();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please sign in</div>;

  return (
    <div>
      <h1>Welcome {currentUser?.firstName}!</h1>
      <h2>Communities Near You</h2>
      {communities?.map((community) => (
        <div key={community.id}>{community.name}</div>
      ))}
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

## License

[Add your license here]

---

Built with ❤️ for local communities everywhere.