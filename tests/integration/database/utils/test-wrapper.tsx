import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface TestWrapperProps {
  children: React.ReactNode;
  queryClient: QueryClient;
}

export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
