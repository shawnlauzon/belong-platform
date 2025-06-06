import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Suspense } from 'react';
import { logger, logComponentRender } from '@/lib/logger';

export const Route = createRootRoute({
  component: () => {
    logComponentRender('RootRoute');
    
    return (
      <div className="min-h-screen">
        <Suspense fallback={
          <div className="min-h-screen bg-amber-50 flex items-center justify-center">
            <div className="animate-pulse text-warmgray-600">Loading...</div>
          </div>
        }>
          <Outlet />
        </Suspense>
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </div>
    );
  },
  errorComponent: ({ error }) => {
    logger.error('🚨 Root route error:', error);
    
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-warmgray-900 mb-4">Oops! Something went wrong</h1>
          <p className="text-warmgray-600 mb-6">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }
});