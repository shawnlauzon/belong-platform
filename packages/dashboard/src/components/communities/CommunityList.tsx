import React, { useState } from 'react';
import { useCommunities, useDeleteCommunity } from '@belongnetwork/api';
import { CommunityForm } from './CommunityForm';
import { ResourceForm } from '../resources/ResourceForm';
import { Plus, Edit, Trash2, Users, MapPin, Loader2 } from 'lucide-react';
import type { Community } from '@belongnetwork/types';

export function CommunityList() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [showCreateResourceForm, setShowCreateResourceForm] = useState(false);
  const [selectedCommunityForResource, setSelectedCommunityForResource] = useState<Community | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const { data: communities, isLoading, error } = useCommunities();
  const deleteMutation = useDeleteCommunity();

  const handleDelete = async (community: Community) => {
    if (window.confirm(`Are you sure you want to delete "${community.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(community.id);
      } catch (error) {
        // Error handling is done by React Query
      }
    }
  };

  const handleEdit = (community: Community) => {
    setEditingCommunity(community);
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setEditingCommunity(null);
  };

  const handleAddResource = (community: Community) => {
    setSelectedCommunityForResource(community);
    setShowCreateResourceForm(true);
  };

  const handleResourceFormClose = () => {
    setShowCreateResourceForm(false);
    setSelectedCommunityForResource(null);
  };

  const handleResourceFormSuccess = () => {
    setShowCreateResourceForm(false);
    setSelectedCommunityForResource(null);
    setShowSuccessMessage(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading communities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">
          Error loading communities: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Communities</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Community
        </button>
      </div>

      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-green-600">
            Resource created successfully!
          </p>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingCommunity ? 'Edit Community' : 'Create New Community'}
          </h3>
          <CommunityForm
            initialData={editingCommunity}
            onSuccess={handleFormClose}
            onCancel={handleFormClose}
          />
        </div>
      )}

      {showCreateResourceForm && selectedCommunityForResource && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Add New Resource to {selectedCommunityForResource.name}
          </h3>
          <ResourceForm
            communityId={selectedCommunityForResource.id}
            communityName={selectedCommunityForResource.name}
            onSuccess={handleResourceFormSuccess}
            onCancel={handleResourceFormClose}
          />
        </div>
      )}

      <div className="grid gap-4">
        {communities?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No communities found. Create your first community!</p>
          </div>
        ) : (
          communities?.map((community) => (
            <div
              key={community.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {community.name}
                  </h3>
                  <p className="text-gray-600 mb-3">{community.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleAddResource(community)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New Resource
                  </button>
                  <button
                    onClick={() => handleEdit(community)}
                    className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(community)}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}