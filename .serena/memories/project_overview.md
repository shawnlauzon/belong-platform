# Belong Network Platform - Project Overview

## Purpose
A TypeScript monorepo for a hyper-local community platform built with React Query and Supabase. Provides data layer hooks for authentication, communities, resources, events, and user management.

## Tech Stack
- **Frontend**: React 18, TypeScript, TanStack Query for data fetching
- **UI**: Tailwind CSS, Radix UI primitives  
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite with pnpm workspaces
- **Testing**: Vitest with jsdom and Testing Library

## Package Structure
- `@belongnetwork/platform` - Data layer with React Query hooks for auth, communities, resources, and users
- `@belongnetwork/components` - Reusable UI components built with Radix UI and Tailwind CSS  
- `@belongnetwork/core` - Shared configuration, utilities, and logger
- `@belongnetwork/types` - TypeScript type definitions and database schema types

## Architecture
Provider-based architecture where you inject your own Supabase configuration. Follows established patterns for React Query hooks and component composition.