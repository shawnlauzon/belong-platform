import React from 'react';
import { Home, Package, Users, Heart, User } from 'lucide-react';
import { useCurrentUser, useSignOut } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';

interface NavigationProps {
  currentPath?: string;
}

export function Navigation({ currentPath }: NavigationProps) {
  const { data: user } = useCurrentUser();
  const signOutMutation = useSignOut();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/resources', label: 'Resources', icon: Package },
    { path: '/community', label: 'Community', icon: Users },
    { path: '/thanks', label: 'Thanks', icon: Heart },
  ];

  const handleSignOut = () => {
    signOutMutation.mutate();
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-gray-900">Belong</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <a
                  href={`/profile/${user.id}`}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <User className="h-4 w-4" />
                  <span>{user.first_name || 'Profile'}</span>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={signOutMutation.isPending}
                >
                  {signOutMutation.isPending ? 'Signing out...' : 'Sign out'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}