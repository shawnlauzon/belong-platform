# Belong Network Platform Overview

## Project Purpose

Belong Network Platform is a TypeScript-first platform for building hyper-local community applications with resource sharing, event management, and social features. It focuses on helping communities share resources, organize events, send direct messages, express gratitude, and maintain geographic communities.

## Core Features

- **Resource Sharing** - Offer or request tools, skills, food, and supplies within local communities
- **Event Management** - Create and attend community gatherings and activities
- **Direct Messaging** - Private messages between community members
- **Gratitude System** - Send shoutouts to community members who have helped
- **Geographic Communities** - Hierarchical communities (neighborhood → city → state)
- **Real-time Updates** - Stay connected with real-time subscription support

## Platform Type

This is a TypeScript monorepo using pnpm workspaces for package management. The main package is `@belongnetwork/platform` which provides React Query hooks for data fetching and mutations.

## Architecture Pattern

- **Single-Purpose Hook Architecture** - Each hook serves one specific purpose
- **Feature-based organization** - Code organized by features (auth, communities, resources, etc.)
- **Provider-based configuration** - BelongProvider wraps the app with configuration
- **Type-safe throughout** - Comprehensive TypeScript coverage
- **React Query for data management** - Built on TanStack Query
