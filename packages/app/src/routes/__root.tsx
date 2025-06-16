import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { Home, Users, Package } from 'lucide-react';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <Home className="w-6 h-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  Belong Network
                </span>
              </Link>
              
              <nav className="hidden md:flex space-x-6">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{
                    className: "text-blue-600 bg-blue-50"
                  }}
                >
                  <Users className="w-4 h-4" />
                  <span>Communities</span>
                </Link>
                <Link
                  to="/resources"
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{
                    className: "text-blue-600 bg-blue-50"
                  }}
                >
                  <Package className="w-4 h-4" />
                  <span>Resources</span>
                </Link>
              </nav>
            </div>

            {/* Auth Status */}
            <span className="text-sm text-gray-600">Auth Status Placeholder</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

    </div>
  );
}