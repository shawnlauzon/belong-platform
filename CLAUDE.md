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
- @belongnetwork/components - Reusable UI components built with Radix UI and Tailwind CSS
- @belongnetwork/core - Shared configuration, utilities, and logger
- @belongnetwork/types - TypeScript type definitions and database schema types


Tech Stack

- Frontend: React 18, TypeScript, TanStack Query for data fetching
- UI: Tailwind CSS, Radix UI primitives
- Database: Supabase (PostgreSQL + PostGIS for spatial data)
- Build: Vite with pnpm workspaces
- Testing: Vitest with jsdom and Testing Library

Development Guidelines

Code Patterns

- Study existing files for established patterns before creating new ones
- Follow component composition patterns established in @belongnetwork/components

Type Safety

- NEVER use any types - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from @belongnetwork/types
- Prefer type-safe patterns over casting or type assertions

TDD

- Always write a test before writing the code
- Use the test file to guide the implementation

Unit Testing

- Each package has its own Vitest configuration
- Skipping tests is not an acceptable way to make tests pass
- All unit tests must pass before committing
- Use faker to generate data for tests and to document expected values

Integration Testing

- Integration tests are located in the tests/integration directory
- Integration tests do not mock anything
- Integration tests import packages from the dist directory
- You may only read and write from the database for test setup or validation
- Use faker to generate data for tests

Code Safety Guidelines

- Prefer function definition to prevent error conditions rather than checking at runtime. Do not make checks at runtime for conditions which are impossible by the function definition.

Development Principles

- A task is only complete when build and typecheck and tests are all successful

## Code Style and Best Practices

- Follow established code patterns and conventions within each package
- Maintain consistent naming conventions across the monorepo

## Memory

- When asked to look at the database definition, either look at database.t
- Never update the database.ts file. Always make changes via a database migration and then pull the types
- To update the database.ts file, run `pnpm run gen:db-types` from the types directory
- If you create the same code more than twice, extract it into a shared function