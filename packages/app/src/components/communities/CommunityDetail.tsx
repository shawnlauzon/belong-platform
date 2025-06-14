import React from 'react';
import { useCommunity } from '@belongnetwork/api';
import { ResourceList } from '../resources/ResourceList';
import { Users, MapPin, Calendar, Loader2 } from 'lucide-react';
import type { Community } from '@belongnetwork/types';

interface CommunityDetailProps {
  communityId: string;
}

export function CommunityDetail({ communityId }: CommunityDetailProps) {
  const { data: community, isLoading, error } = useCommunity(communityId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading community...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">
          Error loading community: {error.message}
        </p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Community not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Community Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {community.name}
        </h1>
        <p className="text-gray-600 mb-4">{community.description}</p>
        
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {community.member_count} members
          </div>
          {community.center && (
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {community.city}
            </div>
          )}
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Created {community.created_at.toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Community Resources */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Community Resources
        </h2>
        <ResourceList communityId={communityId} />
      </div>
    </div>
  );
}