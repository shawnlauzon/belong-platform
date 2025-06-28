import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Import platform components exactly as described in bug report
import { BelongProvider } from '@belongnetwork/platform'

console.log('🚀 main.tsx starting...')

// Provider configuration exactly as described in bug report
const providerConfig = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  mapboxPublicToken: import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN
}

console.log('🔧 Provider config:', {
  supabaseUrl: providerConfig.supabaseUrl,
  hasAnonKey: !!providerConfig.supabaseAnonKey,
  hasMapboxToken: !!providerConfig.mapboxPublicToken
})

// Check if root element exists
const rootElement = document.getElementById('root')
console.log('📍 Root element:', rootElement)

if (!rootElement) {
  throw new Error('Root element not found!')
}

try {
  console.log('🎯 Creating React root...')
  const root = ReactDOM.createRoot(rootElement)
  
  console.log('🎨 Rendering app with BelongProvider...')
  root.render(
    <React.StrictMode>
      <BelongProvider config={providerConfig}>
        <App />
      </BelongProvider>
    </React.StrictMode>
  )
  
  console.log('✅ App rendered successfully!')
} catch (error) {
  console.error('❌ Error during app rendering:', error)
  
  // Fallback: render error message directly to DOM
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h1>❌ App Failed to Render</h1>
        <p><strong>Error:</strong> ${error}</p>
        <p><strong>This reproduces the blank page bug!</strong></p>
      </div>
    `
  }
}