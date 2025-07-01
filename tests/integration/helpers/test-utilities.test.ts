import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { testUtils } from './test-utilities';

describe('TestUtilities', () => {
  describe('waitForHookToInitialize', () => {
    test('should work when called with only hookResult parameter (current failing pattern)', async () => {
      // Arrange: Create a simple hook result
      const { result } = renderHook(() => ({ data: 'test', isLoading: false }));

      // Act & Assert: This should work for the common case where no validator is needed
      // This test should pass after we fix the method signature
      await expect(
        testUtils.waitForHookToInitialize(result as any)
      ).resolves.not.toThrow();
    });

    test('should work with a custom validator', async () => {
      // Arrange: Create a simple hook result
      const { result } = renderHook(() => ({ data: 'test', isLoading: false }));

      // Act & Assert: This should work with a custom validator
      await expect(
        testUtils.waitForHookToInitialize(
          result,
          (current) => current.data === 'test'
        )
      ).resolves.not.toThrow();
    });
  });
});
