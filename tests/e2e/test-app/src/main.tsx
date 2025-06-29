import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BelongProvider } from '@belongnetwork/platform'
import App from './App'

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
    <BrowserRouter>
      <AppWithErrorBoundary />
    </BrowserRouter>
  </React.StrictMode>,
)