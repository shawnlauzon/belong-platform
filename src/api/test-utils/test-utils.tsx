import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * React Query wrapper for testing hooks that use React Query
 */
export function ReactQueryWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
