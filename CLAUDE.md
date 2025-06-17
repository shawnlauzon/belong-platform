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
- Skipping tests is not an acceptable way to make tests pass

Code Patterns

- Study existing files for established patterns before creating new ones
- Follow component composition patterns established in @belongnetwork/components
- Import shared types from @belongnetwork/types

Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime. Do not make checks at runtime for conditions which are impossible by the function definition.

Development Principles

- A task is only complete when build and typecheck and tests are all successful

## Code Style and Best Practices

- Follow established code patterns and conventions within each package
- Maintain consistent naming conventions across the monorepo

## Memory

- When asked to look at the database definition, either look at database.ts or use the supabase MCP
- Never update the database.ts file. Always make changes via a database migration and then pull the types
- To update the database.ts file, use supabase /mcp