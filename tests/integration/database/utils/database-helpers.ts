// Test utilities for database integration tests
// These tests validate that hooks work against real data in the database
// using only hooks, no direct database manipulation

// Test data identifiers - these should exist in your test database
export const TEST_DATA = {
  // Add known community IDs from your test database here
  // These should be stable test data that exists in your database
  KNOWN_COMMUNITY_ID: process.env.TEST_COMMUNITY_ID || null,
  KNOWN_USER_ID: process.env.SEED_MEMBER_ID || null,
} as const;

// Helper to wait for a condition with retries
export async function waitForCondition(
  condition: () => boolean,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

// Helper to generate test names with timestamp to avoid conflicts
export function generateTestName(resourceType: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `INTEGRATION_TEST_${resourceType.toUpperCase()}_${timestamp}_${random}`;
}