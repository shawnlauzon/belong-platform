import { describe, it, expect, beforeAll } from 'vitest';
import { faker } from '@faker-js/faker';

/**
 * Integration test to verify all expected exports are available
 * from the main @belongnetwork/platform package.
 *
 * This test ensures that:
 * 1. All critical functions are properly exported
 * 2. The package can be imported as consumers would use it
 * 3. No build artifacts contain stale/missing exports
 */
describe('Package Exports Integration', () => {
  let platformModule: any;

  beforeAll(async () => {
    // Import the actual built package, not source files
    // This tests the real consumer experience
    try {
      platformModule = await import('@belongnetwork/platform');
    } catch (error) {
      // Fallback to local dist for development
      platformModule = await import('../../dist/index.es.js');
    }
  });

  describe('Global Configuration Exports', () => {
    it('should export initializeBelong function', () => {
      expect(platformModule.initializeBelong).toBeDefined();
      expect(typeof platformModule.initializeBelong).toBe('function');
    });

    it('should export getBelongClient function', () => {
      expect(platformModule.getBelongClient).toBeDefined();
      expect(typeof platformModule.getBelongClient).toBe('function');
    });

    it('should export isInitialized function', () => {
      expect(platformModule.isInitialized).toBeDefined();
      expect(typeof platformModule.isInitialized).toBe('function');
    });

    it('should export resetBelongClient function', () => {
      expect(platformModule.resetBelongClient).toBeDefined();
      expect(typeof platformModule.resetBelongClient).toBe('function');
    });
  });

  describe('Hook Exports', () => {
    const expectedHooks = [
      'useCurrentUser',
      'useSignIn',
      'useSignOut',
      'useSignUp',
      'useCommunities',
      'useCommunity',
      'useCreateCommunity',
      'useResources',
      'useCreateResource',
      'useEvents',
      'useCreateEvent',
      'useThanks',
      'useCreateThanks',
      'useUsers',
      'useCreateUser',
    ];

    it.each(expectedHooks)('should export %s hook', (hookName) => {
      expect(platformModule[hookName]).toBeDefined();
      expect(typeof platformModule[hookName]).toBe('function');
    });
  });

  describe('Type Exports', () => {
    const expectedTypes = [
      'ResourceCategory',
      'MeetupFlexibility',
      'EventAttendanceStatus',
    ];

    it.each(expectedTypes)('should export %s type', (typeName) => {
      expect(platformModule[typeName]).toBeDefined();
    });
  });

  describe('Functional Integration', () => {
    it('should allow basic initialization flow', () => {
      const { initializeBelong, isInitialized, resetBelongClient } =
        platformModule;

      // Reset any existing state
      resetBelongClient();
      expect(isInitialized()).toBe(false);

      // Generate realistic fake URLs and tokens using Faker
      const fakeSupabaseUrl = `https://${faker.string.alphanumeric(8).toLowerCase()}.supabase.co`;
      const fakeJwtToken = faker.internet.jwt();
      const fakeMapboxToken = faker.string.alphanumeric(32);

      // Should be able to initialize with valid URLs (but fake tokens)
      expect(() => {
        initializeBelong({
          supabaseUrl: fakeSupabaseUrl,
          supabaseAnonKey: fakeJwtToken,
          mapboxPublicToken: fakeMapboxToken,
        });
      }).not.toThrow();

      // Should now be initialized
      expect(isInitialized()).toBe(true);
    });
  });

  describe('Import Patterns', () => {
    it('should support direct imports', async () => {
      const { initializeBelong } = await import('@belongnetwork/platform');
      expect(initializeBelong).toBeDefined();
    });

    it('should support subpath imports for hooks', async () => {
      const hooks = await import('@belongnetwork/platform/hooks');
      expect(hooks.useCurrentUser).toBeDefined();
    });

    it('should support subpath imports for types', async () => {
      const types = await import('@belongnetwork/platform/types');
      expect(types.ResourceCategory).toBeDefined();
    });
  });
});
