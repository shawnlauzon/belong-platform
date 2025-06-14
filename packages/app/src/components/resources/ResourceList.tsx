import React, { useState } from 'react';
import { useResources, useDeleteResource } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import { ResourceForm } from './ResourceForm';
import { Plus, Edit, Trash2, Package, Loader2, Search } from 'lucide-react';
import type { Resource, ResourceFilter } from '@belongnetwork/types';

interface ResourceListProps {
  communityId?: string;
}

export function ResourceList({ communityId }: ResourceListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filters, setFilters] = useState<ResourceFilter>({});
  
  const { data: resources, isLoading, error } = useResources(filters);
  const deleteMutation = useDeleteResource();

  const handleDelete = async (resource: Resource) => {
    if (window.confirm(`Are you sure you want to delete "${resource.title}"?`)) {
      try {
        await deleteMutation.mutateAsync(resource.id);
      } catch (error) {
        // Error handling is done by React Query
      }
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setEditingResource(null);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === 'all' ? undefined : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading resources...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">
          Error loading resources: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Resources</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="searchTerm"
                name="searchTerm"
                value={filters.searchTerm || ''}
                onChange={handleFilterChange}
                placeholder="Search resources..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              name="type"
              value={filters.type || 'all'}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="offer">Offers</option>
              <option value="request">Requests</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={filters.category || 'all'}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingResource ? 'Edit Resource' : 'Add New Resource'}
          </h3>
          <ResourceForm
            initialData={editingResource}
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </div>
      )}

      {/* Resources Grid */}
      <div className="grid gap-4">
        {resources?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No resources found. Add your first resource!</p>
          </div>
        ) : (
          resources?.map((resource) => (
            <div
              key={resource.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      resource.type === 'offer' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {resource.type}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      {resource.category}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{resource.description}</p>
                  
                  <div className="text-sm text-gray-500">
                    <p>By {resource.owner.full_name || resource.owner.first_name}</p>
                    {resource.availability && (
                      <p>Available: {resource.availability}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(resource)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(resource)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}