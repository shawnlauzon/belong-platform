import React, { useEffect } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import { AuthProvider } from './providers/AuthProvider';
import { EventProvider } from './providers/EventProvider';
import { eventBus } from '@belongnetwork/core/eventBus/eventBus';
import { logger } from '@belongnetwork/core/utils/logger';
import './index.css';

// Import resource services to initialize them
import '@belongnetwork/resource-services';

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  useEffect(() => {
    logger.info('🚀 App: Application starting up');

    // Trigger initial resource fetch when the app loads
    logger.debug('📦 App: Triggering initial resource fetch');
    eventBus.emit('resource.fetch.requested', {});

    return () => {
      logger.info('🛑 App: Application shutting down');
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <EventProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </EventProvider>
    </QueryClientProvider>
  );
}

export default App;