This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Important

- ALL instructions within this document MUST BE FOLLOWED, these are not optional unless explicitly stated.
- DO NOT edit more code than you have to.
- DO NOT WASTE TOKENS, be succinct and concise.
- **Always use IDE diagnostics to validate code (including tests!) after implementation**
- **Confirm a enum / function / variable / type exists before using it**: Do not just guess!
- **If any MCP resource is unavailable, restart the MCP**
- **You are not done until `pnpm verify` passes**

## Code Style and Best Practices

- Follow established code patterns and conventions within the platform
- Maintain consistent naming conventions across all features
- A maximum file size is around 500 lines
- Only catch errors for 1. logging and rethrowing or 2. if they are specifically expected
- Do not maintain old / legacy interfaces. When you make a change, remove the old code.
- Before stating a feature is done, run verification and fix any problems which arise, regardless of whether they were added by this feature or not.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Run tests with verbose logging (shows console.log statements)
VITEST_VERBOSE=true pnpm test

# TypeScript type checking
pnpm typecheck

# Build the package
pnpm build

# Lint the package
pnpm lint

# Verify the package
pnpm verify

# Run integration tests
pnpm test:integration

# Run a specific integration test
pnpm test:integration <test-file-name>

```

## Architecture Overview

Belong Network Platform is a TypeScript library for building hyper-local community applications with React Query and Supabase.

### Package Structure

- **@belongnetwork/platform** - Single package containing the complete data layer with React Query hooks, services, and utilities for auth, communities, resources (including events), feed, images, shoutouts, trust-scores, and users

### Tech Stack

- **Frontend**: React 18, TypeScript, TanStack Query (React Query) v5
- **Database**: Supabase (PostgreSQL + PostGIS for spatial data)
- **Build**: Vite
- **Testing**: Vitest with jsdom and Testing Library

## Features

The platform is organized into feature modules in `src/features/`. Each feature has its own CLAUDE.md with detailed documentation.

- **[resources](src/features/resources/CLAUDE.md)** - Core resource sharing (offers, requests, events) with timeslots and claim workflows
- **[auth](src/features/auth/CLAUDE.md)** - Authentication and user account management
- **[comments](src/features/comments/CLAUDE.md)** - Threading comment system for resources and shoutouts
- **[communities](src/features/communities/CLAUDE.md)** - Geographic/interest-based communities with boundaries and membership
- **[feed](src/features/feed/CLAUDE.md)** - Aggregated activity feed of resources, events, and shoutouts
- **[images](src/features/images/CLAUDE.md)** - Image upload and storage for various entities
- **[invitations](src/features/invitations/CLAUDE.md)** - Community invitation codes and connection tracking
- **[messaging](src/features/messaging/CLAUDE.md)** - Direct messaging between users and community chats
- **[notifications](src/features/notifications/CLAUDE.md)** - Multi-type notification system with user preferences
- **[shoutouts](src/features/shoutouts/CLAUDE.md)** - Public appreciation posts within communities
- **[trust-scores](src/features/trust-scores/CLAUDE.md)** - Gamified reputation system per community
- **[users](src/features/users/CLAUDE.md)** - User profiles with public/private data distinction

## Development Guidelines

### Code Patterns

- Study existing files for established patterns before creating new ones
- Follow the feature-based architecture with hooks, api, transformers, and types

### Type Safety

- NEVER use `any` types - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from `src/shared/types/database.ts`
- Prefer type-safe patterns over casting or type assertions

### Testing Approach

- Write unit tests only for functionality that does not interact with the database
- Write integration tests for functionality that does interact with the database

- **Unit tests**: Located in `__tests__` directories within each feature - test isolated logic with mocked dependencies
- **Integration tests**: Located in `tests/integration` directory - test real end-to-end behavior with live database
- Skipping tests is not an acceptable way to make tests pass
- A problem must fail the test; logging errors is only for debugging
- **ALWAYS use createFake\* utilities from src/test-utils for generating test data**
- Use faker to generate data for tests and to document expected values

## Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime
- Do not make checks at runtime for conditions which are impossible by the function definition

## Development Principles

- A task is only complete when build, typecheck, unit tests, and integration tests are all successful

## Database Management

- Use supabase-local MCP to understand what the database looks like now
- Avoid looking at old migrations in order to understand the database schema
- Avoid using supabase-prod MCP unless you really need to see production data
- **Always use `pnpx supabase migration new` to create a new migration**
- If a migration already exists in the working directory, update it instead of creating a new one

### Migration files

- Always create a migration file before making changes to the database
- Minimize the number of individual migration files; if one is in the workspace, do not create another
- After a migration file is created, run `pnpx supabase db reset` to apply it to the local database`
- Never push a migration file to production; that is my job.

## Memory

- When asked to look at the database definition, look at `src/shared/types/database.ts`
- NEVER MANUALLY UPDATE THE DATABASE.TS FILE. Always make changes via a database migration and then pull the types
- To update the database.ts file, run `pnpm run gen:db-types` from the project root
- If you create the same code more than twice, extract it into a shared function
- Remove old code when it is no longer used
- When you believe you have fixed a problem, run the test to confirm before continuing
- Use supabase-local mcp for supabase commands except for gen:db-types to generate types into database.ts
- In migrations, always start with the current definition from the live database. DO NOT RELY ON OLD MIGRATIONS.