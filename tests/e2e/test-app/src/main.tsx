import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { BelongProvider } from '@belongnetwork/platform'
import App from './App'

const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  mapboxPublicToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '',
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BelongProvider config={config}>
        <App />
      </BelongProvider>
    </BrowserRouter>
  </React.StrictMode>,
)