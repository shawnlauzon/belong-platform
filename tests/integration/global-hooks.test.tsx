import { describe, test, expect, beforeAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { faker } from '@faker-js/faker'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  useCurrentUser,
  useCommunities,
  useResources,
  useEvents,
  useSignUp,
  useSignIn,
  useSignOut
} from '@belongnetwork/platform'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0, staleTime: 0 },
    mutations: { retry: false }
  }
})

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Global Hooks Integration', () => {
  beforeAll(async () => {
    const { initializeBelong } = await import('../../dist/index.es.js')
    
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    })
  })

  test('hooks work with global initialization only', async () => {
    // Query hooks should work
    const { result: userResult } = renderHook(() => useCurrentUser(), { wrapper: TestWrapper })
    const { result: communitiesResult } = renderHook(() => useCommunities(), { wrapper: TestWrapper })
    const { result: resourcesResult } = renderHook(() => useResources(), { wrapper: TestWrapper })
    const { result: eventsResult } = renderHook(() => useEvents(), { wrapper: TestWrapper })

    // Mutation hooks should work
    const { result: signUpResult } = renderHook(() => useSignUp(), { wrapper: TestWrapper })
    const { result: signInResult } = renderHook(() => useSignIn(), { wrapper: TestWrapper })
    const { result: signOutResult } = renderHook(() => useSignOut(), { wrapper: TestWrapper })

    // Wait for initial load
    await waitFor(() => !userResult.current.isLoading, { timeout: 5000 })

    // All hooks should be functional
    expect(userResult.current).toBeDefined()
    expect(communitiesResult.current).toBeDefined() 
    expect(resourcesResult.current).toBeDefined()
    expect(eventsResult.current).toBeDefined()
    expect(signUpResult.current.mutate).toBeDefined()
    expect(signInResult.current.mutate).toBeDefined()
    expect(signOutResult.current.mutate).toBeDefined()
  })
})