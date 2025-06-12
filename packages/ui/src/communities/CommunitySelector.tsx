import React from 'react';
import { useCommunities } from '@belongnetwork/api';
import { ChevronDown } from 'lucide-react';

interface CommunitySelectorProps {
  selectedCommunityId?: string;
  onCommunityChange?: (communityId: string) => void;
}

export function CommunitySelector({ selectedCommunityId, onCommunityChange }: CommunitySelectorProps) {
  const { data: communities, isLoading } = useCommunities();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const selectedCommunity = communities?.find(c => c.id === selectedCommunityId);

  return (
    <div className="relative">
      <select
        value={selectedCommunityId || ''}
        onChange={(e) => onCommunityChange?.(e.target.value)}
        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <option value="">Select Community</option>
        {communities?.map((community) => (
          <option key={community.id} value={community.id}>
            {community.name} ({community.member_count} members)
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}