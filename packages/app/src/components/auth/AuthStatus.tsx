import React from 'react';
import { useCurrentUser, useSignOut } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import { User, LogOut, Loader2 } from 'lucide-react';

export function AuthStatus() {
  const { data: user, isLoading } = useCurrentUser();
  const signOutMutation = useSignOut();

  const handleSignOut = () => {
    signOutMutation.mutate();
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
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={signOutMutation.isPending}
      >
        {signOutMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <LogOut className="w-4 h-4 mr-1" />
            Sign Out
          </>
        )}
      </Button>
    </div>
  );
}