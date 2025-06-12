# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build all packages  
pnpm build

# Run tests
pnpm test

# Run tests for specific package
pnpm --filter @belongnetwork/core test

# Lint all packages
pnpm lint

# Format code
pnpm format

# Run linting and type checking before committing
pnpm lint && pnpm build
```

## Architecture Overview

**Belong Network** is a TypeScript monorepo built with pnpm workspaces implementing an event-driven architecture for a hyper-local community platform.

### Package Structure

- **`@belongnetwork/app`** - Main React application with TanStack Router
- **`@belongnetwork/core`** - Event bus, state management (Zustand), types, and utilities  
- **`@belongnetwork/components`** - Reusable UI components (Radix UI + Tailwind)
- **`@belongnetwork/community-services`** - Community CRUD operations
- **`@belongnetwork/resource-services`** - Resource sharing/requesting services
- **`@belongnetwork/trust-services`** - Trust system and thanks management
- **`@belongnetwork/user-services`** - Authentication and profile management

### Event-Driven Architecture

The application uses a central event bus (`@belongnetwork/core/event-bus`) for inter-service communication:

- Services emit events when entities change (create, update, delete)
- State stores listen to events and update accordingly
- UI components subscribe to state changes through Zustand stores
- This decouples services from UI and enables reactive updates

### Key Patterns

**Service Layer**: Each domain has dedicated service classes with CRUD operations that emit events on state changes.

**State Management**: Zustand stores with event listeners that automatically update when services emit events.

**Database Integration**: Supabase with PostgreSQL + PostGIS for spatial data. Row Level Security (RLS) policies implemented.

**Type Safety**: Comprehensive TypeScript types for all entities, with database schema types auto-generated.

## Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Router, TanStack Query
- **State**: Zustand with event-driven updates
- **UI**: Tailwind CSS, Radix UI primitives, Lucide React icons
- **Database**: Supabase (PostgreSQL + PostGIS)
- **Maps**: Mapbox GL for location services
- **Build**: Vite with pnpm workspaces
- **Testing**: Vitest with jsdom and Testing Library

## Development Notes

**Adding New Services**: Follow the existing service pattern - create service class, emit events on changes, add corresponding Zustand store with event listeners.

**Location Features**: Use PostGIS spatial queries for location-based functionality. Location data is stored as geography type with spatial indexing.

**Component Development**: Use existing Radix UI primitives and follow Tailwind patterns established in `@belongnetwork/components`.

**Database Changes**: Add migrations in `supabase/migrations/` and update TypeScript types accordingly.

**Testing**: Each package has its own Vitest configuration. Use Testing Library for component tests and mock Supabase client for service tests.