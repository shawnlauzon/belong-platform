import React, { useState } from 'react';
import { useCommunities, useDeleteCommunity } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import { CommunityForm } from './CommunityForm';
import { Plus, Edit, Trash2, Users, MapPin, Loader2 } from 'lucide-react';
import type { Community } from '@belongnetwork/types';

export function CommunityList() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  
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
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Community
        </Button>
      </div>

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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(community)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(community)}
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