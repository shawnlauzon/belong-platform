Integration Testing

- Integration tests do not mock anything
- Integration tests import packages from the dist directory
- Integration tests import hooks from the actual dist bundle to test the published package
- You may only read and write from the database for test setup or validation
- Use faker to generate data for tests
- Tests should verify correct behavior, not document problems.
