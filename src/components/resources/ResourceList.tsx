import React, { useState } from 'react';
import { ResourceCard } from './ResourceCard';
import { Resource, ResourceFilter } from '@/types';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResourceListProps {
  resources: Resource[];
  isLoading: boolean;
  onRequestResource: (resourceId: string) => void;
}

export function ResourceList({ resources, isLoading, onRequestResource }: ResourceListProps) {
  const [filter, setFilter] = useState<ResourceFilter>({
    category: 'all',
    type: 'all',
    maxDriveMinutes: 8,
    searchTerm: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (key: keyof ResourceFilter, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const filteredResources = React.useMemo(() => {
    return resources.filter(resource => {
      // Category filter
      if (filter.category && filter.category !== 'all' && resource.category !== filter.category) {
        return false;
      }
      
      // Type filter
      if (filter.type && filter.type !== 'all' && resource.type !== filter.type) {
        return false;
      }
      
      // Search term filter
      if (
        filter.searchTerm && 
        !resource.title.toLowerCase().includes(filter.searchTerm.toLowerCase()) &&
        !resource.description.toLowerCase().includes(filter.searchTerm.toLowerCase())
      ) {
        return false;
      }
      
      return true;
    });
  }, [resources, filter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm h-[200px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warmgray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              value={filter.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
        
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 animate-fade-in">
            {/* Type filter */}
            <div>
              <label className="block text-xs font-medium text-warmgray-700 mb-1">Type</label>
              <select 
                className="w-full border border-gray-200 rounded-md text-sm p-2"
                value={filter.type as string}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="offer">Offers</option>
                <option value="request">Requests</option>
              </select>
            </div>
            
            {/* Category filter */}
            <div>
              <label className="block text-xs font-medium text-warmgray-700 mb-1">Category</label>
              <select 
                className="w-full border border-gray-200 rounded-md text-sm p-2"
                value={filter.category as string}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="tools">Tools</option>
                <option value="skills">Skills</option>
                <option value="food">Food</option>
                <option value="supplies">Supplies</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      {/* Resource grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => (
            <ResourceCard 
              key={resource.id} 
              resource={resource}
              onRequest={onRequestResource}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-warmgray-500">No resources match your filters.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setFilter({
              category: 'all',
              type: 'all',
              maxDriveMinutes: 8,
              searchTerm: '',
            })}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}