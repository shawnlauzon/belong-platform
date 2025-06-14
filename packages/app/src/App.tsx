import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { useCurrentUser } from '@belongnetwork/api';

// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

// Create the router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: {
      user: null,
    },
  },
});

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// Auth provider component to inject current user into router context
function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  
  React.useEffect(() => {
    router.invalidate();
  }, [user]);

  // Update router context with current user
  React.useEffect(() => {
    router.update({
      context: {
        queryClient,
        auth: {
          user: user || null,
        },
      },
    });
  }, [user]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;