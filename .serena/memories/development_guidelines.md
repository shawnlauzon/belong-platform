# Development Guidelines

## Core Principles
1. **Test-Driven Development (TDD) is MANDATORY**
   - Always write a failing test before code
   - Test guides the implementation
   - Never fix code without reproducing the problem in a test first

2. **Type Safety First**
   - Never use `any` types in production code
   - All functions require explicit type annotations
   - Use generated database types from @belongnetwork/types
   - Prefer compile-time safety over runtime checks

3. **Single Responsibility**
   - Each hook serves one specific purpose
   - Each service method does one thing
   - Files should not exceed ~500 lines

## Development Workflow

### 1. Starting a New Feature
```bash
# 1. Write failing unit test
# 2. Implement minimal code to pass
# 3. Refactor while keeping tests green
# 4. Run pnpm tdd before committing
```

### 2. Debugging Approach
- Write a unit test that reproduces the bug
- Only mock external dependencies (Supabase), never platform code
- If integration tests fail but unit tests pass, investigate environmental differences
- Fix root causes, not symptoms

### 3. Code Review Checklist
- [ ] TDD followed (test written first)
- [ ] No `any` types
- [ ] Follows existing patterns
- [ ] Tests use createMock* utilities
- [ ] All commands pass: `pnpm tdd`

## Important Rules from CLAUDE.md
- **DO NOT edit more code than necessary**
- **DO NOT create files unless absolutely necessary**
- **ALWAYS prefer editing existing files**
- **NEVER proactively create documentation files**
- **A task is only complete when all tests pass**

## Testing Philosophy
- Unit tests mock only external dependencies
- Integration tests use real database connections
- Never skip tests to make them pass
- Problems must fail tests, not just log errors
- Clear test names that describe expected behavior

## Database Development
- Never update database.ts directly
- Always use migrations via Supabase MCP
- Run `pnpm gen:db-types` after schema changes
- Keep all packages version-aligned

## Common Anti-Patterns to Avoid
- Mocking platform code in tests
- Adding workarounds instead of fixing root causes
- Skipping the failing test step
- Writing tests that expect buggy behavior
- Using console.log for debugging tests