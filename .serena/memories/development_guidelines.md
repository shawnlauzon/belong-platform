# Development Guidelines

## Code Safety Guidelines
- Prefer function definition to prevent error conditions rather than checking at runtime
- Do not make checks at runtime for conditions which are impossible by the function definition

## Type Safety
- NEVER use any types - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from @belongnetwork/types
- Prefer type-safe patterns over casting or type assertions

## TDD Requirements
- Always write a test before writing the code
- Use the test file to guide the implementation
- A task is only complete when build and typecheck and tests are all successful

## Testing
- Each package has its own Vitest configuration
- Skipping tests is not an acceptable way to make tests pass
- A problem must fail the test; logging errors is only for debugging
- **ALWAYS use createMock* utilities from @belongnetwork/platform/src/test-utils for generating test data**
- Use faker to generate data for tests and to document expected values
- Unit tests are located in the **tests** directory of the feature
- Integration tests are located in the tests/integration directory

## Database Guidelines
- Never update the database.ts file directly
- Always make schema changes via database migrations
- To update the database.ts file, run `pnpm run gen:db-types` from the types directory
- Use the supabase MCP to interact with the database

## Code Style
- Follow established code patterns and conventions within each package
- Maintain consistent naming conventions across the monorepo
- Maximum file size is around 500 lines
- If you create the same code more than twice, extract it into a shared function
- Keep versions of all packages aligned
- Do not deprecate; remove unused code

## Memory Rules
- When asked to look at the database definition, look at database.ts
- When you commit after bumping a version, tag with that version
- When you believe you have fixed a problem, run the test to confirm before continuing
- Run integration tests with `pnpm test:integration` from the project directory