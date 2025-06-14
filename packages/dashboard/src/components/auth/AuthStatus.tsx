import React from 'react';
import { useCurrentUser, useSignOut } from '@belongnetwork/api';
import { User, LogOut, Loader2 } from 'lucide-react';

export function AuthStatus() {
  const { data: user, isLoading } = useCurrentUser();
  const signOutMutation = useSignOut();

  const handleSignOut = () => {
    signOutMutation.mutate();
    // Redirect to auth page after sign out
    window.location.href = '/auth';
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
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
            {user.full_name || user.first_name || 'User'}
          </p>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        disabled={signOutMutation.isPending}
        className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {signOutMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <LogOut className="w-4 h-4 mr-1" />
            Sign Out
          </>
        )}
      </button>
    </div>
  );
}