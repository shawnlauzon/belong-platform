import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Import route tree
import { routeTree } from './routeTree.gen';

// Import providers
import { AuthProvider } from './providers/AuthProvider';
import { EventProvider } from './providers/EventProvider';

// Import styles
import './index.css';

// Initialize user services (this will register all event handlers)
import '@belongnetwork/user-services';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EventProvider>
          <RouterProvider router={router} />
        </EventProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);