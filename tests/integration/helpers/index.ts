// Export all helper utilities for easy importing
export * from "./test-data-factory";
export * from "./auth-helpers";
export * from "./cleanup-patterns";
export * from "./test-utilities";
export * from "./react-query-wrapper";

// Re-export commonly used testing utilities
export {
  renderHook,
  act,
  waitFor,
  render,
  screen,
} from "@testing-library/react";

export {
  describe,
  test,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  vi,
} from "vitest";

// Export faker for convenience
export { faker } from "@faker-js/faker";