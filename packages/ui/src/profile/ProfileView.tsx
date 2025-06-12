import React from 'react';
import { Avatar, Card } from '@belongnetwork/components';
import type { User } from '@belongnetwork/types';

interface ProfileViewProps {
  user: User;
}

export function ProfileView({ user }: ProfileViewProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <img 
            src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.first_name}`}
            alt={user.first_name}
          />
        </Avatar>
        
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {user.first_name} {user.last_name}
          </h2>
          <p className="text-gray-600">
            Member since {user.created_at.toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  );
}