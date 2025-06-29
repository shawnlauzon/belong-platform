# Task Completion Checklist

## Before Committing Changes
1. **Run unit tests**: `pnpm test` - All tests must pass
2. **Type checking**: `pnpm typecheck` - No type errors
3. **Linting**: `pnpm lint` - Fix all warnings and errors  
4. **Build validation**: `pnpm build` - Must build successfully

## TDD Process (Mandatory)
1. **Write failing test first** - Test must demonstrate the problem
2. **Implement minimal code** - Make the test pass
3. **Refactor if needed** - Keep tests green
4. **All unit tests must be green before continuing**

## Full QA Process  
Run the full QA suite:
```bash
pnpm qa
```
This runs: `pnpm tdd && pnpm build && pnpm test:integration && pnpm test:acceptance`

## For Publishing
1. Run complete test suite: `pnpm test:complete`
2. Bump patch version in all package.json files
3. Commit changes
4. Tag with version
5. Publish

## Integration Testing
- Run integration tests: `pnpm test:integration` 
- Integration tests validate real database interactions
- Must pass before considering feature complete

## Pre-commit Hook
The project uses Husky for pre-commit hooks, so some checks run automatically on commit.