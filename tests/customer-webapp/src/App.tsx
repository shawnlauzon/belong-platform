import React from 'react'
// Import platform hooks exactly as described in bug report
import { useAuth, useCommunities, useResources, useEvents } from '@belongnetwork/platform'

console.log('🔍 App.tsx loading...')

function App() {
  console.log('🎯 App component rendering...')
  
  try {
    console.log('🔍 Hook execution check starting...')
    
    // Use the new API pattern with { list, byId }
    const communitiesHook = useCommunities()
    const resourcesHook = useResources()
    const eventsHook = useEvents()
    const authHook = useAuth()
    
    console.log('🔍 Hook execution check:', { 
      communitiesHook,
      authHook,
      resourcesHook,
      eventsHook
    })
    
    // Test fetching communities with new API
    const [communities, setCommunities] = React.useState([])
    const [communitiesLoading, setCommunitiesLoading] = React.useState(true)
    
    React.useEffect(() => {
      const fetchCommunities = async () => {
        try {
          const data = await communitiesHook.list()
          setCommunities(data || [])
          console.log('📊 Communities data:', data)
        } catch (error) {
          console.error('❌ Error fetching communities:', error)
        } finally {
          setCommunitiesLoading(false)
        }
      }
      
      if (communitiesHook.list) {
        fetchCommunities()
      }
    }, [communitiesHook])
    
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>✅ Customer WebApp Test</h1>
        <p><strong>Status:</strong> App rendered successfully!</p>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <h3>Platform Hook Status:</h3>
          <p>✅ BelongProvider: Working</p>
          <p>✅ useAuth: {authHook ? 'Working' : 'Not initialized'}</p>
          <p>✅ useCommunities: {communitiesHook?.list ? 'Working' : 'Failed'}</p>
          <p>✅ useResources: {resourcesHook?.list ? 'Working' : 'Failed'}</p>
          <p>✅ useEvents: {eventsHook?.list ? 'Working' : 'Failed'}</p>
        </div>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e8' }}>
          <h3>Communities Data:</h3>
          <p>Loading: {communitiesLoading ? 'Yes' : 'No'}</p>
          <p>Count: {communities?.length || 0}</p>
        </div>
        
        <div style={{ marginTop: '20px', color: '#666' }}>
          <small>
            This test reproduces the webapp runtime environment described in the bug report.
            If you see this page, the platform integration is working correctly.
            If you see a blank page, the bug has been reproduced.
          </small>
        </div>
      </div>
    )
  } catch (error) {
    console.error('❌ Error in App component:', error)
    
    return (
      <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
        <h1>❌ App Component Error</h1>
        <p><strong>Error:</strong> {String(error)}</p>
        <p><strong>This may be causing the blank page issue!</strong></p>
        
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#ffe6e6' }}>
          <h3>Debugging Information:</h3>
          <p>• Check browser console for detailed error messages</p>
          <p>• Verify @belongnetwork/platform package is installed correctly</p>
          <p>• Check that environment variables are properly configured</p>
          <p>• Test with @belongnetwork/platform@0.1.7 vs 0.1.8</p>
        </div>
      </div>
    )
  }
}

export default App