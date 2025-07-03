# Task Completion Checklist

When completing any development task in the Belong Platform, follow this checklist:

## Before Starting a Task
1. **Always write a failing unit test first** (TDD mandatory)
2. Use the test file to guide the implementation
3. Check existing patterns in similar files

## During Development
1. **Follow TDD cycle**:
   - Red: Write failing test
   - Green: Make minimal code to pass
   - Refactor: Clean up while keeping tests green
2. **Never skip the failing test step**
3. **Only fix code after reproducing the problem in a test**

## Before Committing
Always run these commands in order:

```bash
# 1. Lint check
pnpm lint

# 2. Type check
pnpm typecheck

# 3. Run unit tests
pnpm test

# 4. Run integration tests (if applicable)
pnpm -w test:integration

# 5. Build verification
pnpm build
```

## Task Completion Criteria
A task is **only complete** when:
- ✅ All linting passes (`pnpm lint`)
- ✅ All type checks pass (`pnpm typecheck`)
- ✅ All unit tests pass (`pnpm test`)
- ✅ All integration tests pass (if relevant)
- ✅ Build succeeds (`pnpm build`)
- ✅ No regression in existing tests
- ✅ New functionality has appropriate test coverage

## Common Completion Issues to Check
- No `any` types in production code
- All functions have explicit type annotations
- Using generated database types from @belongnetwork/types
- Tests use createMock* utilities from test-utils
- Following established patterns from existing code
- File sizes under ~500 lines

## Database Changes
If you made database changes:
1. Apply migration via Supabase MCP tools
2. Run `pnpm gen:db-types` to update TypeScript types
3. Verify generated types are correct

## Final Verification
Run the full TDD command one more time:
```bash
pnpm tdd  # Ensures lint, typecheck, and tests all pass
```