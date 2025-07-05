import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { BelongProvider } from '../../config';

/**
 * Standard test configuration for BelongProvider
 */
const DEFAULT_TEST_CONFIG = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
  mapboxPublicToken: 'test-token',
};

/**
 * Creates a React Query wrapper for hook testing
 * This eliminates duplicate wrapper setup across test files
 */
export function createTestWrapper(
  options: {
    queryClientOptions?: ConstructorParameters<typeof QueryClient>[0];
    config?: typeof DEFAULT_TEST_CONFIG;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    ...options.queryClientOptions,
  });

  const config = { ...DEFAULT_TEST_CONFIG, ...options.config };

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(BelongProvider, {
        config,
        children,
      }),
    );

  return { wrapper, queryClient };
}

/**
 * Quick wrapper creation for tests that don't need custom options
 */
export function createDefaultTestWrapper() {
  return createTestWrapper();
}
