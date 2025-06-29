import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import CommunitiesPage from './pages/CommunitiesPage'
import ResourcesPage from './pages/ResourcesPage'
import EventsPage from './pages/EventsPage'

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Belong Platform E2E Test App</h1>
      
      <nav style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '10px' }}>Home</Link>
        <Link to="/auth" style={{ marginRight: '10px' }}>Auth</Link>
        <Link to="/communities" style={{ marginRight: '10px' }}>Communities</Link>
        <Link to="/resources" style={{ marginRight: '10px' }}>Resources</Link>
        <Link to="/events" style={{ marginRight: '10px' }}>Events</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/events" element={<EventsPage />} />
      </Routes>
    </div>
  )
}

function HomePage() {
  return (
    <div>
      <h2>E2E Test Home</h2>
      <p>This app is used for E2E testing of the @belongnetwork/platform package.</p>
      <p data-testid="status">App loaded successfully</p>
    </div>
  )
}

export default App