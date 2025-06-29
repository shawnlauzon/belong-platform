# E2E Tests for @belongnetwork/platform

This directory contains end-to-end tests for the Belong Network platform package using Playwright.

## Structure

```
e2e/
├── test-app/           # React application for E2E testing
├── fixtures/           # Test fixtures and page objects
├── specs/              # Test specifications
│   ├── smoke/         # Basic smoke tests
│   ├── auth/          # Authentication flow tests
│   ├── communities/   # Community workflow tests
│   ├── resources/     # Resource workflow tests
│   └── events/        # Event workflow tests
└── utils/             # Test utilities and helpers
```

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   pnpm e2e:install
   ```

2. Configure environment variables:
   ```bash
   cp tests/e2e/test-app/.env tests/e2e/test-app/.env.local
   # Edit .env.local with your test Supabase credentials
   ```

3. Build the platform package:
   ```bash
   pnpm build
   ```

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests with UI mode
pnpm test:e2e:ui

# Debug tests
pnpm test:e2e:debug

# View test report
pnpm test:e2e:report

# Run the test app in development mode
pnpm e2e:dev
```

## Writing Tests

1. Use Page Object Models for better maintainability
2. Follow the existing test patterns
3. Keep tests focused and independent
4. Use data-testid attributes for reliable element selection

## Test Categories

- **Smoke Tests**: Basic functionality and app loading
- **Auth Tests**: Authentication flows (sign up, sign in, sign out)
- **Feature Tests**: Specific platform features (communities, resources, events)
- **User Journey Tests**: Complete end-to-end workflows

## Debugging

- Screenshots are captured on failure
- Videos are retained for failed tests
- Use `--debug` flag for step-by-step debugging
- Check `playwright-report/` for detailed test results