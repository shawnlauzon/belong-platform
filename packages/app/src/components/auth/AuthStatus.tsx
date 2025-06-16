import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../providers';

export function AuthStatus() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center space-x-2">
        <User className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-600">Not signed in</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <User className="w-4 h-4 text-gray-600" />
        <div className="text-sm">
          <p className="font-medium text-gray-900">
            {user?.fullName || user?.firstName || 'User'}
          </p>
          <p className="text-gray-500">{user?.email}</p>
        </div>
      </div>
      <span className="text-sm text-gray-600">Signed in</span>
    </div>
  );
}