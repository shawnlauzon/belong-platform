# Belong Platform - Project Overview

## Purpose
A TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features.

## Tech Stack
- **Frontend**: React 18, TypeScript, TanStack Query for data fetching
- **UI**: Tailwind CSS, Radix UI primitives
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite with pnpm workspaces
- **Testing**: Vitest with jsdom and Testing Library
- **Monorepo**: pnpm workspaces

## Package Structure
- `@belongnetwork/platform` - Main data layer with React Query hooks for auth, communities, resources, and users
- `packages/api` - API package
- `packages/core` - Shared configuration, utilities, and logger  
- `packages/types` - TypeScript type definitions and database schema types

## Core Features Tested
- Authentication (sign up, sign in, sign out)
- Communities CRUD operations
- Resources CRUD operations  
- Events CRUD operations
- Thanks/gratitude system CRUD operations
- User management
- Package exports validation

## Environment Requirements
- Node.js 18+
- React 18+
- TypeScript 5+
- Supabase account
- Mapbox account (for location features)

## Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_MAPBOX_PUBLIC_TOKEN`