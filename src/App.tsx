import React, { useEffect } from 'react';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { locationManager, initializeListeners } from '@/features/app';
import { AuthProvider } from '@/lib/auth';
import { routeTree } from './routeTree.gen';
import { logger, logComponentRender } from '@/lib/logger';
import './index.css';

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
        await locationManager.getCurrentLocation();
        initializeListeners();
        logger.info('✅ Application initialized successfully');
      } catch (error) {
        logger.error('❌ Error initializing app:', error);
      }
    };
    
    init();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;