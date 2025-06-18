import { describe, test, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { faker } from '@faker-js/faker'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  initializeBelong,
  useResources,
  useEvents,
  resetBelongClient
} from '@belongnetwork/platform'

// Create a fresh query client for each test
let queryClient: QueryClient

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('User Scenario Integration', () => {
  beforeEach(() => {
    // Reset platform state and create fresh query client for each test
    resetBelongClient()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { 
          retry: false,
          gcTime: 0,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false
        },
        mutations: { 
          retry: false 
        }
      }
    })
  })

  test('useResources should work after calling initializeBelong', async () => {
    const testId = faker.string.alphanumeric(8)
    console.log(`[User Scenario ${testId}] Testing useResources after initialization`)

    // Simulate exactly what the user is doing
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    })

    // Use the hook immediately after initialization (like user does)
    const { result } = renderHook(() => useResources(), {
      wrapper: TestWrapper
    })

    // Wait for the hook to complete
    await waitFor(() => {
      return !result.current.isLoading
    }, { timeout: 30000, interval: 1000 })

    console.log(`[User Scenario ${testId}] Resources result:`, {
      isLoading: result.current.isLoading,
      isSuccess: result.current.isSuccess,
      isError: result.current.isError,
      hasData: !!result.current.data,
      dataLength: result.current.data?.length
    })

    // Hook should not be in error state after proper initialization
    expect(result.current.isError).toBe(false)
    
    // Hook should either succeed or be in a stable state (not loading)
    expect(result.current.isLoading).toBe(false)
    
    // If successful, data should be an array
    if (result.current.isSuccess) {
      expect(Array.isArray(result.current.data)).toBe(true)
    }
  })

  test('useEvents should work after calling initializeBelong', async () => {
    const testId = faker.string.alphanumeric(8)
    console.log(`[User Scenario ${testId}] Testing useEvents after initialization`)

    // Simulate exactly what the user is doing
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    })

    // Use the hook immediately after initialization (like user does)
    const { result } = renderHook(() => useEvents(), {
      wrapper: TestWrapper
    })

    // Wait for the hook to complete
    await waitFor(() => {
      return !result.current.isLoading
    }, { timeout: 30000, interval: 1000 })

    console.log(`[User Scenario ${testId}] Events result:`, {
      isLoading: result.current.isLoading,
      isSuccess: result.current.isSuccess,
      isError: result.current.isError,
      hasData: !!result.current.data,
      dataLength: result.current.data?.length
    })

    // Hook should not be in error state after proper initialization
    expect(result.current.isError).toBe(false)
    
    // Hook should either succeed or be in a stable state (not loading)
    expect(result.current.isLoading).toBe(false)
    
    // If successful, data should be an array
    if (result.current.isSuccess) {
      expect(Array.isArray(result.current.data)).toBe(true)
    }
  })

  test('both useResources and useEvents should work together after initialization', async () => {
    const testId = faker.string.alphanumeric(8)
    console.log(`[User Scenario ${testId}] Testing both hooks together after initialization`)

    // Simulate exactly what the user is doing
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    })

    // Use both hooks at the same time (common user pattern)
    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper: TestWrapper
    })
    
    const { result: eventsResult } = renderHook(() => useEvents(), {
      wrapper: TestWrapper
    })

    // Wait for both hooks to complete
    await waitFor(() => {
      return !resourcesResult.current.isLoading && !eventsResult.current.isLoading
    }, { timeout: 30000, interval: 1000 })

    console.log(`[User Scenario ${testId}] Combined results:`, {
      resources: {
        isLoading: resourcesResult.current.isLoading,
        isSuccess: resourcesResult.current.isSuccess,
        isError: resourcesResult.current.isError,
        hasData: !!resourcesResult.current.data
      },
      events: {
        isLoading: eventsResult.current.isLoading,
        isSuccess: eventsResult.current.isSuccess,
        isError: eventsResult.current.isError,
        hasData: !!eventsResult.current.data
      }
    })

    // Both hooks should not be in error state after proper initialization
    expect(resourcesResult.current.isError).toBe(false)
    expect(eventsResult.current.isError).toBe(false)
    
    // Both hooks should either succeed or be in a stable state (not loading)
    expect(resourcesResult.current.isLoading).toBe(false)
    expect(eventsResult.current.isLoading).toBe(false)
  })
})