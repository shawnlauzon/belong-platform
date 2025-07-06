import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import CommunitiesPage from './pages/CommunitiesPage';
import ResourcesPage from './pages/ResourcesPage';
import EventsPage from './pages/EventsPage';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Belong Network Platform E2E Test App</h1>

      <nav style={{ marginBottom: '20px' }}>
        <Link to="/" style={{ marginRight: '10px' }}>
          Home
        </Link>
        <Link to="/auth" style={{ marginRight: '10px' }}>
          Auth
        </Link>
        <Link to="/communities" style={{ marginRight: '10px' }}>
          Communities
        </Link>
        <Link to="/resources" style={{ marginRight: '10px' }}>
          Resources
        </Link>
        <Link to="/events" style={{ marginRight: '10px' }}>
          Events
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/auth"
          element={
            <PageWrapper>
              <AuthPage />
            </PageWrapper>
          }
        />
        <Route
          path="/communities"
          element={
            <PageWrapper>
              <CommunitiesPage />
            </PageWrapper>
          }
        />
        <Route
          path="/resources"
          element={
            <PageWrapper>
              <ResourcesPage />
            </PageWrapper>
          }
        />
        <Route
          path="/events"
          element={
            <PageWrapper>
              <EventsPage />
            </PageWrapper>
          }
        />
      </Routes>
    </div>
  );
}

function HomePage() {
  return (
    <div>
      <h2>E2E Test Home</h2>
      <p>
        This app is used for E2E testing of the @belongnetwork/platform package.
      </p>
      <p data-testid="status">App loaded successfully</p>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>{children}</React.Suspense>
  );
}

export default App;
