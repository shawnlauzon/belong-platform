// Debug script to test community creation
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateCommunity, BelongProvider } from "./dist/index.es.js";
import React from "react";

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <BelongProvider config={config}>{children}</BelongProvider>
  </QueryClientProvider>
);

const testData = {
  name: "Debug Test Community",
  description: "Test community for debugging",
  level: "neighborhood",
  timeZone: "America/New_York",
  organizerId: "test-user-id",
  parentId: null,
  hierarchyPath: [{ level: "test", name: "Test" }],
  memberCount: 1,
};

console.log("Testing community creation...");

const { result } = renderHook(() => useCreateCommunity(), { wrapper });

act(() => {
  result.current.mutate(testData);
});

setTimeout(() => {
  console.log("Mutation result:", {
    isSuccess: result.current.isSuccess,
    isPending: result.current.isPending,
    isError: result.current.isError,
    error: result.current.error,
    data: result.current.data,
  });
  process.exit(0);
}, 3000);
