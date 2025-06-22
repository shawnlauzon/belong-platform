# BUG REPORT: Package Export Issues Confirmed

## Status: REPRODUCED ✅

**Test Location**: `tests/acceptance/`  
**Test Command**: `pnpm test:acceptance`  
**Discovery Date**: 2025-06-22  

## Summary

The QA testing has **successfully reproduced** the package export issues described in the original bug report. The acceptance tests confirm that the distribution files contain broken relative paths that prevent proper module resolution.

## Root Cause Confirmed

### 1. Broken Type Definition Paths
**File**: `dist/src/index.d.ts`  
**Issue**: Contains references to non-existent relative paths:
```typescript
export * from '../packages/api/src';
export * from '../packages/types/src';
export * as hooks from '../packages/api/src';
export * as types from '../packages/types/src';
export { /* ... */ } from '../packages/core/src';
```

### 2. Empty/Insufficient Export Chain
**Files**: 
- `dist/index.d.ts` → Only contains `export * from './src/index'`
- `dist/hooks.d.ts` → Only contains `export * from './src/hooks'` 
- `dist/src/hooks.d.ts` → Only contains `export * from '../packages/api/src/hooks'`

### 3. Missing Internal Dependencies
The package references `@belongnetwork/api`, `@belongnetwork/types`, and `@belongnetwork/core` which are not bundled into the published package.

## Test Evidence

### Failing Test Output
```
FAIL tests/acceptance/package-validation.test.ts
Error: Type definition missing export: useAuth
```

### Test Results Summary
- ✅ **Basic Package Import**: Package can be imported (no runtime errors)
- ✅ **Runtime Exports Work**: All hooks and components are accessible at runtime
- ❌ **Type Definitions Broken**: TypeScript cannot resolve exports due to broken paths
- ✅ **No Missing Dependencies at Runtime**: Package works when imported

## Real-World Impact

This explains the exact TypeScript compilation errors reported:
- `error TS2305: Module '"@belongnetwork/platform"' has no exported member 'useAuth'`
- `error TS2305: Module '"@belongnetwork/platform"' has no exported member 'BelongProvider'`

The runtime JavaScript works, but TypeScript compilation fails because the `.d.ts` files reference non-existent paths.

## Technical Details

### Working vs Broken
- **Runtime Import**: ✅ `import pkg from '@belongnetwork/platform'` works
- **Runtime Destructuring**: ✅ `const { useAuth } = pkg` works  
- **TypeScript Compilation**: ❌ `import { useAuth } from '@belongnetwork/platform'` fails

### Why Integration Tests Pass
The integration tests pass because:
1. They test the locally built `dist/` files where the `packages/` directory exists
2. Runtime JavaScript execution doesn't require type definitions
3. The actual bundled JavaScript code is working correctly

## QA Recommendation

**Priority**: HIGH - Blocks TypeScript consumers  
**Scope**: All npm package consumers using TypeScript  
**Fix Required**: Build process must generate proper type definitions without broken relative paths

## Test Coverage Added

The new acceptance test suite (`tests/acceptance/`) now provides:
- ✅ Package structure validation
- ✅ Type definition path checking  
- ✅ Export completeness verification
- ✅ Dependency reference validation
- ✅ Reproduction of exact bug scenario

## Next Steps for Development Team

1. **Fix Build Process**: Update Vite/TypeScript configuration to generate correct `.d.ts` files
2. **Bundle Dependencies**: Ensure internal packages are properly bundled rather than referenced
3. **Add CI Validation**: Include acceptance testing in CI pipeline
4. **Test Published Package**: Verify fixes against actual npm published package

---
**QA Engineer**: Claude Code  
**Test Environment**: @belongnetwork/platform@0.1.6 (local)  
**Bug Status**: Confirmed and Reproducible