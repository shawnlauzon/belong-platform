# Task Completion Checklist

## Before Any Commit
1. Run `pnpm tdd` and fix any warnings and errors
2. All unit tests must be green before adding new features
3. Always run unit tests before committing

## Development Workflow
1. **Write a Failing Test First** - Always create a unit test that reproduces the exact problem before attempting any fixes
2. **Fix the Root Cause, Not Symptoms** - Don't mask problems with workarounds
3. **Verify the Fix Completely** - Both unit tests and integration tests should pass
4. Run type checking: `pnpm typecheck`
5. Run linting: `pnpm lint`  
6. Run tests: `pnpm test`
7. Run build: `pnpm build`

## Before Publishing
1. Run `pnpm qa` and fix any warnings and errors
2. Bump the patch version in all package.json files
3. Commit changes
4. Tag with the version
5. Publish

## Database Changes
- Never update the `database.ts` file directly
- Always make changes via a database migration
- After any database change, run `gen:db-types` from the types package to update `database.ts`
- Run integration tests with `pnpm test:integration` from the project directory

## Version Management
- Keep versions of all packages aligned
- When you commit after bumping a version, tag with that version
- Do not deprecate; remove

## Quality Gates
- A task is only complete when build, typecheck, and tests are all successful
- When you believe you have fixed a problem, run the test to confirm before continuing