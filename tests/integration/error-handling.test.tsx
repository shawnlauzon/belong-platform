import { describe, test, expect, beforeAll } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { faker } from '@faker-js/faker'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
  initializeBelong,
  useCurrentUser,
  useCommunities,
  useResources,
  useEvents
} from '@belongnetwork/platform'

// Create a simple test wrapper matching real client usage
const queryClient = new QueryClient({
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

interface TestWrapperProps {
  children: React.ReactNode
}

function TestWrapper({ children }: TestWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Test the platform with global initialization - exactly like real clients
beforeAll(() => {
  // Initialize the platform once at app startup (like real clients)
  initializeBelong({
    supabaseUrl: process.env.VITE_SUPABASE_URL!,
    supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
    mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
  });
})

describe('Error Handling Integration', () => {
  test('should demonstrate that useCurrentUser logs ERROR for missing auth sessions', async () => {
    const testId = faker.string.alphanumeric(8)
    console.log(`[Error Test ${testId}] Testing that useCurrentUser inappropriately logs ERROR for missing auth`)

    // Test hooks that should handle auth session missing gracefully
    const { result: currentUserResult } = renderHook(() => useCurrentUser(), {
      wrapper: TestWrapper
    })

    await waitFor(() => {
      return !currentUserResult.current.isLoading
    }, { timeout: 15000, interval: 1000 })

    // Document what we observe vs what should happen:
    console.log(`[Error Test ${testId}] Current hook state:`, {
      isLoading: currentUserResult.current.isLoading,
      isError: currentUserResult.current.isError,
      hasData: !!currentUserResult.current.data
    })
    
    console.log(`[Error Test ${testId}] Check stderr above - ERROR level logs for AuthSessionMissingError`)
    console.log(`[Error Test ${testId}] ISSUE: Missing auth sessions should be handled gracefully at DEBUG level`)
    
    // This test fails to document the issue that needs to be fixed
    throw new Error(`PLATFORM BUG: useCurrentUser logs ERROR level messages for missing auth sessions. Check stderr output above. Missing auth sessions are expected for unauthenticated users and should be handled at DEBUG level, not ERROR level.`)
  })

  test('should demonstrate resource/community access without authentication errors', async () => {
    const testId = faker.string.alphanumeric(8)
    console.log(`[Error Test ${testId}] Testing unauthenticated resource access`)

    // Capture console.error calls
    const originalConsoleError = console.error
    const errorLogs: string[] = []
    console.error = (...args: any[]) => {
      errorLogs.push(args.join(' '))
      originalConsoleError(...args)
    }

    try {
      // Test data hooks - these should either work with public data or fail gracefully
      const { result: communitiesResult } = renderHook(() => useCommunities(), {
        wrapper: TestWrapper
      })

      const { result: resourcesResult } = renderHook(() => useResources(), {
        wrapper: TestWrapper
      })

      const { result: eventsResult } = renderHook(() => useEvents(), {
        wrapper: TestWrapper
      })

      // Wait for all hooks to complete
      await waitFor(() => {
        return !communitiesResult.current.isLoading && 
               !resourcesResult.current.isLoading && 
               !eventsResult.current.isLoading
      }, { timeout: 30000, interval: 1000 })

      // Check if any data hooks are throwing authentication errors
      const dataFetchErrors = errorLogs.filter(log => 
        (log.includes('communities') || log.includes('resources') || log.includes('events')) &&
        log.includes('ERROR')
      )

      if (dataFetchErrors.length > 0) {
        console.log(`[Error Test ${testId}] Found ${dataFetchErrors.length} data fetch errors:`)
        dataFetchErrors.forEach((error, i) => {
          console.log(`  ${i + 1}: ${error.substring(0, 200)}...`)
        })
        
        // Data hooks should either succeed with public data or fail silently
        // They should not throw errors for missing authentication when fetching public data
        throw new Error(`PLATFORM BUG: Data hooks should handle missing authentication gracefully. Found ${dataFetchErrors.length} data fetch errors.`)
      }

      console.log(`[Error Test ${testId}] Data fetch test completed - hooks handled unauthenticated access appropriately`)

    } finally {
      // Restore original console.error
      console.error = originalConsoleError
    }
  })
})