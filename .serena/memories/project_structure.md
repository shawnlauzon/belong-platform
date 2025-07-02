# Project Structure

## Root Structure
```
belong-platform/
├── src/                    # Main source code
│   ├── features/          # Feature-based modules
│   ├── shared/            # Shared utilities and components
│   ├── config/            # Configuration files
│   ├── api/               # API layer (deprecated structure)
│   └── index.ts           # Main export file
├── tests/                 # Test files
│   ├── integration/       # Integration tests
│   └── e2e/              # End-to-end tests
├── scripts/              # Build and utility scripts
├── supabase/             # Supabase migrations and config
└── .serena/              # Serena memories (gitignored)
```

## Features Directory Structure
```
src/features/
├── auth/                 # Authentication
│   ├── hooks/           # React hooks (useSignIn, useSignOut, etc.)
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   └── __tests__/       # Unit tests
├── communities/          # Community management
├── resources/           # Resource sharing
├── events/              # Event management
├── conversations/       # Direct messaging
├── shoutouts/          # Gratitude system
└── users/              # User profiles
```

## Key Architectural Patterns
1. **Feature-based organization** - Each feature is self-contained
2. **Hooks expose functionality** - All features accessed via React hooks
3. **Services contain logic** - Business logic separated from UI
4. **Types are strictly typed** - Database and domain types separated
5. **Tests mirror structure** - Test files in __tests__ directories

## Export Pattern
- Main exports from `src/index.ts`
- Feature exports from `src/features/index.ts`
- Each feature has its own `index.ts` barrel export
- Types exported separately for tree-shaking

## Configuration Files
- `tsconfig.json` - TypeScript configuration with references
- `vite.config.mts` - Vite build configuration
- `vitest.config.mts` - Test configuration
- `eslint.config.js` - ESLint rules
- `.env` - Environment variables (Supabase, Mapbox)

## Package Information
- **Name**: @belongnetwork/platform
- **Version**: 0.2.2
- **Type**: ESM module
- **Entry**: dist/index.es.js (ESM), dist/index.cjs.js (CJS)