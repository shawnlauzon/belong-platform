# Acceptance Testing

- Acceptance tests verify the published npm package from the registry meets consumer expectations
- These tests DO NOT use local dist builds or local packages
- These tests reproduce real-world consumer scenarios
- Tests force import from the npm registry version only
- Use faker to generate data for tests
- Tests should verify correct behavior and document actual problems with published packages