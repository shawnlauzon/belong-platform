import { renderHook, act, waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import type React from 'react';
import { testWrapperManager } from './react-query-wrapper';

export interface TestHookOptions {
  timeout?: number;
  interval?: number;
}

export class TestUtilities {
  private wrapper = testWrapperManager.getWrapper();

  renderHookWithWrapper<TProps, TResult>(
    hook: (props: TProps) => TResult,
    wrapper?: React.ComponentType<any>,
    options?: { initialProps?: TProps },
  ): RenderHookResult<TResult, TProps> {
    return renderHook(hook, {
      wrapper: wrapper || this.wrapper,
      ...options,
    });
  }

  async waitForHookToInitialize<T>(
    hookResult: { current: T },
    options: TestHookOptions = {},
  ): Promise<void> {
    const { timeout = 10000, interval = 100 } = options;

    await waitFor(
      () => {
        expect(hookResult.current).toBeDefined();
        expect(hookResult.current).not.toBeNull();
      },
      { timeout, interval },
    );
  }

  async performAsyncAction<T>(
    action: () => Promise<T>,
    description?: string,
  ): Promise<T> {
    let result: T;

    await act(async () => {
      try {
        result = await action();
      } catch (error) {
        console.error(
          `Action failed${description ? ` (${description})` : ''}:`,
          error,
        );
        throw error;
      }
    });

    return result!;
  }

  async waitForCondition(
    condition: () => boolean,
    options: TestHookOptions = {},
  ): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;

    await waitFor(
      () => {
        expect(condition()).toBe(true);
      },
      { timeout, interval },
    );
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  createMockTimestamp(): number {
    return Date.now();
  }

  createUniqueId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async waitForQueryResult<T>(
    queryResult: {
      current: {
        data?: T | null;
        isError: boolean;
        error?: Error | null;
        isLoading?: boolean;
      };
    },
    options: TestHookOptions = {},
    context?: string,
  ): Promise<T> {
    const { timeout = 5000, interval = 100 } = options;
    const contextMsg = context ? ` (${context})` : '';

    await waitFor(
      () => {
        const result = queryResult.current;
        expect(result.data !== undefined || result.isError).toBe(true);
      },
      { timeout, interval },
    );

    if (queryResult.current.isError) {
      const error = queryResult.current.error;
      throw new Error(
        `Query failed${contextMsg}: ${error?.message || 'Unknown error'}`,
      );
    }

    const data = queryResult.current.data;
    if (data === undefined || data === null) {
      throw new Error(
        `Expected query to have data but got ${data}${contextMsg}`,
      );
    }

    return data;
  }

  async measureExecutionTime<T>(
    operation: () => Promise<T>,
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();

    return {
      result,
      duration: endTime - startTime,
    };
  }

  assertResponseShape<T extends Record<string, any>>(
    response: T,
    expectedShape: Partial<Record<keyof T, any>>,
  ): void {
    expect(response).toMatchObject(expectedShape);

    // Verify all expected keys are present
    Object.keys(expectedShape).forEach((key) => {
      expect(response).toHaveProperty(key);
    });
  }

  async ensureDataConsistency<T>(
    fetchFunction: () => Promise<T>,
    expectedData: Partial<T>,
    options: TestHookOptions = {},
  ): Promise<T> {
    const { timeout = 5000 } = options;

    let lastResult: T;

    await waitFor(
      async () => {
        lastResult = await fetchFunction();
        expect(lastResult).toMatchObject(expectedData);
      },
      { timeout },
    );

    return lastResult!;
  }

  createTestExpectations() {
    return {
      toBeValidId: (value: any) => {
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      },

      toBeValidEmail: (value: any) => {
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      },

      toBeValidTimestamp: (value: any) => {
        expect(value).toBeDefined();
        const date = new Date(value);
        expect(date).toBeInstanceOf(Date);
        expect(date.getTime()).not.toBeNaN();
      },

      toBeRecentTimestamp: (value: any, maxAgeMs: number = 60000) => {
        const date = new Date(value);
        const now = new Date();
        const age = now.getTime() - date.getTime();
        expect(age).toBeLessThan(maxAgeMs);
      },
    };
  }
}

export const testUtils = new TestUtilities();

// Common assertion patterns
export const commonExpectations = testUtils.createTestExpectations();

// Helper for common test patterns
export async function testCRUDOperation<
  TCreate,
  TUpdate,
  TEntity extends { id: string },
>(
  service: {
    create: (data: TCreate) => Promise<TEntity>;
    update: (id: string, data: TUpdate) => Promise<TEntity>;
    delete: (id: string) => Promise<void>;
    list: () => Promise<TEntity[]>;
  },
  createData: TCreate,
  updateData: TUpdate,
  validateEntity: (entity: TEntity) => void,
): Promise<void> {
  // Create
  const created = await testUtils.performAsyncAction(
    () => service.create(createData),
    'create operation',
  );

  validateEntity(created);
  commonExpectations.toBeValidId(created.id);

  // Read (verify in list)
  const listAfterCreate = await service.list();
  expect(listAfterCreate).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: created.id })]),
  );

  // Update
  const updated = await testUtils.performAsyncAction(
    () => service.update(created.id, updateData),
    'update operation',
  );

  expect(updated.id).toBe(created.id);
  validateEntity(updated);

  // Delete
  await testUtils.performAsyncAction(
    () => service.delete(created.id),
    'delete operation',
  );

  // Verify deletion
  const listAfterDelete = await service.list();
  expect(listAfterDelete).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ id: created.id })]),
  );
}
