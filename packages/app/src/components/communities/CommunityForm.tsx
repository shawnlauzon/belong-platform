import React, { useState, useEffect } from 'react';
import { useCreateCommunity, useUpdateCommunity } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import { Loader2 } from 'lucide-react';
import type { Community, CreateCommunityData, UpdateCommunityData } from '@belongnetwork/types';

interface CommunityFormProps {
  initialData?: Community | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CommunityForm({ initialData, onSuccess, onCancel }: CommunityFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const createMutation = useCreateCommunity();
  const updateMutation = useUpdateCommunity();

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (initialData) {
        const updateData: UpdateCommunityData = {
          id: initialData.id,
          ...formData,
        };
        await updateMutation.mutateAsync(updateData);
      } else {
        const createData: CreateCommunityData = {
          ...formData,
          parent_id: '01936b3a-0003-7000-8000-000000000004', // Austin community ID
        };
        await createMutation.mutateAsync(createData);
      }
      onSuccess?.();
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Community Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          minLength={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter community name"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          required
          minLength={10}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your community"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">
            {error.message || 'An error occurred. Please try again.'}
          </p>
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            initialData ? 'Update Community' : 'Create Community'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}