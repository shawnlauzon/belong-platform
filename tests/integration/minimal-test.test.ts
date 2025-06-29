import {
  describe,
  test,
  expect,
} from "vitest";
import {
  renderHook,
} from "@testing-library/react";
import {
  useAuth,
} from "@belongnetwork/platform";
import {
  testWrapperManager,
  testUtils,
} from "./helpers";

describe("Minimal Test", () => {
  test("should render auth hook without crashing", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signUp === 'function'
    );

    // Just check basic properties exist
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.isAuthenticated).toBe('boolean');
  });
});