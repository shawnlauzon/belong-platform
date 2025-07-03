import { renderHook, act, waitFor } from '@testing-library/react';
import { dbHelper } from '../setup/database-setup';
import { testWrapperManager } from './react-query-wrapper';

export interface CleanupOptions {
  cleanupUsers?: boolean;
  cleanupData?: boolean;
  clearCache?: boolean;
  namePattern?: string;
}

export class CleanupHelper {
  async performCleanup(options: CleanupOptions = {}): Promise<void> {
    const {
      cleanupUsers = false,
      cleanupData = true,
      clearCache = true,
      namePattern = 'TEST',
    } = options;

    try {
      // Clean up test data first
      if (cleanupData) {
        await dbHelper.cleanupTestData(namePattern);
      }

      // Clean up test users (usually only in teardown)
      if (cleanupUsers) {
        await dbHelper.cleanupTestUsers();
      }

      // Clear React Query cache
      if (clearCache) {
        testWrapperManager.clearCache();
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  async cleanupBetweenTests(): Promise<void> {
    await this.performCleanup({
      cleanupUsers: false, // Keep users between tests for performance
      cleanupData: true,
      clearCache: true,
    });
  }

  async cleanupAfterAllTests(): Promise<void> {
    console.log('🧹 Running final cleanup after all tests');

    // Use complete cleanup for thorough cleanup after all tests
    try {
      await dbHelper.cleanupAllTestData();
    } catch (error) {
      console.warn(
        'Complete cleanup failed, falling back to standard cleanup:',
        error
      );
      await this.performCleanup({
        cleanupUsers: true,
        cleanupData: true,
        clearCache: true,
      });
    }

    // Clear React Query cache
    testWrapperManager.clearCache();

    console.log('✅ Final cleanup completed');
  }

  async cleanupByResourceType(
    resourceType:
      | 'communities'
      | 'resources'
      | 'events'
      | 'shoutouts'
      | 'messages',
    namePattern: string = 'TEST'
  ): Promise<void> {
    try {
      switch (resourceType) {
        case 'communities':
          await dbHelper.cleanupTestData(namePattern);
          break;
        case 'resources':
          await dbHelper.cleanupTestData(namePattern);
          break;
        case 'events':
          await dbHelper.cleanupTestData(namePattern);
          break;
        case 'shoutouts':
          await dbHelper.cleanupTestData(namePattern);
          break;
        case 'messages':
          await dbHelper.cleanupTestData(namePattern);
          break;
      }
    } catch (error) {
      console.warn(`Cleanup of ${resourceType} failed:`, error);
    }
  }

  async ensureTestIsolation(): Promise<void> {
    // Only clear cache, don't reset the entire wrapper (preserves auth state)
    testWrapperManager.clearCache();

    // Don't clear persistent storage as it may contain auth state
    // if (typeof window !== 'undefined') {
    //   window.localStorage.clear();
    //   window.sessionStorage.clear();
    // }
  }

  async waitForCleanupCompletion(): Promise<void> {
    // Wait for any pending queries to complete
    await testWrapperManager.waitForQueries();

    // Small delay to ensure cleanup operations have completed
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export const cleanupHelper = new CleanupHelper();

export async function withCleanup<T>(
  testFunction: () => Promise<T>,
  options?: CleanupOptions
): Promise<T> {
  try {
    // Ensure clean state before test
    await cleanupHelper.ensureTestIsolation();

    // Run the test
    const result = await testFunction();

    return result;
  } finally {
    // Always clean up after test
    await cleanupHelper.performCleanup(options);
  }
}

export function createCleanupPattern(namePattern: string) {
  return {
    beforeEach: async () => {
      await cleanupHelper.ensureTestIsolation();
    },
    afterEach: async () => {
      await cleanupHelper.cleanupBetweenTests();
    },
    afterAll: async () => {
      await cleanupHelper.cleanupAfterAllTests();
    },
  };
}
