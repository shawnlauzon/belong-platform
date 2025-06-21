import { useSignUp, BelongProvider } from "./dist/index.es.js";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN,
};

console.log("Config:", config);
console.log("useSignUp function:", useSignUp);
console.log("BelongProvider function:", BelongProvider);

const queryClient = new QueryClient();

const wrapper = ({ children }) =>
  React.createElement(
    QueryClientProvider,
    { client: queryClient },
    React.createElement(BelongProvider, { config }, children),
  );

try {
  const { result } = renderHook(() => useSignUp(), { wrapper });
  console.log("Hook result:", result.current);
  console.log("Hook result type:", typeof result.current);
  console.log("Hook result null check:", result.current === null);
} catch (error) {
  console.error("Error calling hook:", error);
}
