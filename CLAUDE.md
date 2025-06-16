# CLAUDE.md

This file provides guidance to Claude Code when working with the Belong Network codebase.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run tests (API package only)
pnpm test

# TypeScript type checking
pnpm typecheck          # Check all packages
pnpm typecheck:api      # Check API package only

# Build all packages
pnpm build

# Lint all packages
pnpm lint

# Format code
pnpm format

# Run comprehensive checks before committing
pnpm lint && pnpm typecheck && pnpm build

Architecture Overview

Belong Network is a TypeScript monorepo for a hyper-local community platform built with React Query and
Supabase.

Package Structure

- @belongnetwork/api - Data layer with React Query hooks for auth, communities, resources, and users
- @belongnetwork/app - Main React application with TanStack Router
- @belongnetwork/components - Reusable UI components built with Radix UI and Tailwind CSS
- @belongnetwork/core - Shared configuration, utilities, and logger
- @belongnetwork/dashboard - Administrative dashboard application
- @belongnetwork/types - TypeScript type definitions and database schema types

Data Fetching Patterns

Communities: Use SQL joins for complete data retrieval including joined profile data.

Resources: Use cache assembly pattern - fetch base entity first, then assemble related owner and community
data through separate cached calls.

Thanks: Use cache assembly pattern like resources - fetch base thanks records, then batch fetch related user and resource data.

Tech Stack

- Frontend: React 18, TypeScript, TanStack Query for data fetching
- UI: Tailwind CSS, Radix UI primitives
- Database: Supabase (PostgreSQL + PostGIS for spatial data)
- Build: Vite with pnpm workspaces
- Testing: Vitest with jsdom and Testing Library

Development Guidelines

Type Safety

- NEVER use any types - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from @belongnetwork/types
- Prefer type-safe patterns over casting or type assertions

Testing

- Each package has its own Vitest configuration
- Use established Supabase client mocking patterns found in existing test files
- Do not validate specific error messages
- Leverage createMock* utilities from @belongnetwork/api/src/test-utils
- Follow the transformer testing patterns: mock the transformer functions rather than complex data setup
- Tests that validate edge cases are ok to skip if necessary

Data Access

- Follow transformer patterns: toDomain* functions convert DB rows to domain objects
- Use forDb* functions to convert domain objects for database operations
- Communities use SQL joins, Resources use cache assembly
- Handle errors gracefully with proper logging via the core logger

Code Patterns

- Study existing files for established patterns before creating new ones
- Use React Query hooks from @belongnetwork/api for all data fetching
- Follow component composition patterns established in @belongnetwork/components
- Import shared types from @belongnetwork/types

Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime. Do not make checks at runtime for conditions which are impossible by the function definition.

Development Principles

- A task is only complete when build and typecheck and tests are all successful

Code Organization Guidelines

- Import only from root features, never from impl. Export necessary functions as needed using the feature index.ts file

## Code Style and Best Practices

- Skipping tests is not an acceptable way to make tests pass