import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { Home } from 'lucide-react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <Home className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  Belong Network
                </span>
              </Link>
            </div>
            <div>
              <span className="text-sm text-gray-600">Simple Version</span>
            </div>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}