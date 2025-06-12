import React from 'react';
import { useResources } from '@belongnetwork/api';
import { ResourceCard } from './ResourceCard';
import type { ResourceFilter } from '@belongnetwork/types';

interface ResourceListProps {
  filters?: ResourceFilter;
  onResourceClick?: (resourceId: string) => void;
}

export function ResourceList({ filters, onResourceClick }: ResourceListProps) {
  const { data: resources, isLoading, error } = useResources(filters);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-20 bg-gray-200 rounded mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load resources. Please try again.</p>
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No resources found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={() => onResourceClick?.(resource.id)}
        />
      ))}
    </div>
  );
}