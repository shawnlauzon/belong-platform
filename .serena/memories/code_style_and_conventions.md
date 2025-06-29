# Code Style and Conventions

## Type Safety
- **NEVER use `any` types** - always create proper interfaces, union types, or use type assertions
- All functions and components must have explicit type annotations
- Use generated database types from `@belongnetwork/types`
- Prefer type-safe patterns over casting or type assertions

## Testing Conventions
- **ALWAYS use `createMock*` utilities** from `@belongnetwork/platform/src/test-utils` for generating test data
- Use faker to generate data for tests and to document expected values
- Unit tests are located in the `tests` directory of the feature
- Integration tests are located in the `tests/integration` directory
- Skipping tests is not acceptable - a problem must fail the test
- Use proper mocking strategy: only mock external dependencies (like Supabase), never mock platform code

## TDD Process
- Always write a test before writing the code
- Use the test file to guide the implementation
- Red: Write a failing test that demonstrates the problem
- Green: Fix the minimum code needed to make the test pass
- Refactor: Clean up the implementation while keeping tests green

## Code Organization
- Study existing files for established patterns before creating new ones
- Follow component composition patterns established in `@belongnetwork/components`
- Maximum file size is around 500 lines
- Maintain consistent naming conventions across the monorepo
- If you create the same code more than twice, extract it into a shared function

## Development Principles
- Prefer function definition to prevent error conditions rather than checking at runtime
- Do not make checks at runtime for conditions which are impossible by the function definition
- A task is only complete when build, typecheck, and tests are all successful