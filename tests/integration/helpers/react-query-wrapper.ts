import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BelongProvider } from "@belongnetwork/platform";
import { testConfig } from "../setup/database-setup";

export interface TestWrapperProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Don't retry failed requests in tests
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: true, // Always refetch on mount for fresh data
        refetchOnReconnect: false, // Don't refetch on reconnect
        gcTime: 0, // Don't cache data between tests
        staleTime: 0, // Consider data immediately stale
      },
      mutations: {
        retry: false, // Don't retry failed mutations in tests
      },
    },
    logger: {
      log: () => {}, // Silence query logs in tests
      warn: () => {},
      error: () => {},
    },
  });
}

export function createTestWrapper(queryClient?: QueryClient): React.FC<TestWrapperProps> {
  const client = queryClient || createTestQueryClient();

  return function TestWrapper({ children }: TestWrapperProps) {
    return React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(
        BelongProvider,
        { config: testConfig },
        children
      )
    );
  };
}

export class TestWrapperManager {
  private queryClient: QueryClient;
  private wrapper: React.FC<TestWrapperProps>;

  constructor() {
    this.queryClient = createTestQueryClient();
    this.wrapper = createTestWrapper(this.queryClient);
  }

  getWrapper(): React.FC<TestWrapperProps> {
    return this.wrapper;
  }

  getQueryClient(): QueryClient {
    return this.queryClient;
  }

  clearCache(): void {
    this.queryClient.clear();
  }

  reset(): void {
    this.clearCache();
    // Force garbage collection of the old client
    this.queryClient = createTestQueryClient();
    this.wrapper = createTestWrapper(this.queryClient);
  }

  async waitForQueries(): Promise<void> {
    await this.queryClient.getQueryCache().findAll().forEach(query => {
      if (query.state.status === "pending") {
        return query.promise;
      }
    });
  }
}

export const testWrapperManager = new TestWrapperManager();