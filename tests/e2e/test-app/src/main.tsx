import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BelongProvider } from '@belongnetwork/platform'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
      retry: false, // Disable retries for E2E testing
    }
  }
})

const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://fake-url.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key',
  mapboxPublicToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || 'fake-mapbox-token',
}

console.log('E2E Test App: BelongProvider config:', {
  hasSupabaseUrl: !!config.supabaseUrl,
  hasAnonKey: !!config.supabaseAnonKey,
  hasMapboxToken: !!config.mapboxPublicToken,
})

function AppWithErrorBoundary() {
  try {
    return (
      <BelongProvider config={config}>
        <App />
      </BelongProvider>
    )
  } catch (error) {
    console.error('BelongProvider failed:', error)
    return <App />
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppWithErrorBoundary />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)