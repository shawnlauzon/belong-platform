import React, { useEffect } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from '~/providers/AuthProvider';
import { routeTree } from './routeTree.gen';
import { logger, logComponentRender } from '@belongnetwork/core';
import './index.css';
import { EventProvider } from '~/providers/EventProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  context: {
    queryClient,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function App() {
  logComponentRender('App');

  useEffect(() => {
    const init = async () => {
      try {
        logger.info('🚀 Initializing application...');

        logger.info('✅ Application initialized successfully');
      } catch (error) {
        logger.error('❌ Error initializing app:', error);
      }
    };

    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <EventProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </EventProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
