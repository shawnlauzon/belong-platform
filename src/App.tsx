import React, { useEffect } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { locationManager, initializeListeners } from '@/features/app';
import { routeTree } from './routeTree.gen';
import './index.css';

// Create a new React query client
const queryClient = new QueryClient();

// Create a new router instance
const router = createRouter({ routeTree });

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  // Initialize the app
  useEffect(() => {
    // Get user location and initialize event listeners
    locationManager.getCurrentLocation();
    initializeListeners();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;