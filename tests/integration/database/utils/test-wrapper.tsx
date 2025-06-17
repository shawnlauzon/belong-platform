import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BelongClientProvider } from '@belongnetwork/api/context/BelongClientProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { 
      retry: false,
      gcTime: 0, // Don't cache between tests
      staleTime: 0, // Always fetch fresh data
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

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <BelongClientProvider
      config={{
        supabaseUrl: process.env.VITE_SUPABASE_URL!,
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
        mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
        logLevel: 'silent' // Suppress logs during tests
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BelongClientProvider>
  )
}