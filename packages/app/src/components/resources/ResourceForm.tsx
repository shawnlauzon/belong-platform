import React, { useState, useEffect } from 'react';
import { useCreateResource, useUpdateResource } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import { Loader2 } from 'lucide-react';
import type { Resource, CreateResourceData, UpdateResourceData } from '@belongnetwork/types';

interface ResourceFormProps {
  initialData?: Resource | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ResourceForm({ initialData, onSuccess, onCancel }: ResourceFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'offer' as 'offer' | 'request',
    category: 'tools' as 'tools' | 'skills' | 'food' | 'supplies' | 'other',
    image_urls: '',
    availability: '',
    pickup_instructions: '',
    parking_info: '',
    meetup_flexibility: 'home_only' as 'home_only' | 'public_meetup_ok' | 'delivery_possible',
  });

  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource();

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title,
        description: initialData.description,
        type: initialData.type,
        category: initialData.category,
        image_urls: initialData.image_urls.join(', '),
        availability: initialData.availability || '',
        pickup_instructions: initialData.pickup_instructions || '',
        parking_info: initialData.parking_info || '',
        meetup_flexibility: initialData.meetup_flexibility,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const imageUrls = formData.image_urls
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (initialData) {
        const updateData: UpdateResourceData = {
          id: initialData.id,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          image_urls: imageUrls,
          availability: formData.availability || undefined,
          pickup_instructions: formData.pickup_instructions || undefined,
          parking_info: formData.parking_info || undefined,
          meetup_flexibility: formData.meetup_flexibility,
        };
        await updateMutation.mutateAsync(updateData);
      } else {
        const createData: CreateResourceData = {
          title: formData.title,
          description: formData.description,
          type: formData.type,
          category: formData.category,
          image_urls: imageUrls,
          availability: formData.availability || undefined,
          pickup_instructions: formData.pickup_instructions || undefined,
          parking_info: formData.parking_info || undefined,
          meetup_flexibility: formData.meetup_flexibility,
          is_active: true,
        };
        await createMutation.mutateAsync(createData);
      }
      onSuccess?.();
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="offer">Offer</option>
            <option value="request">Request</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="tools">Tools</option>
            <option value="skills">Skills</option>
            <option value="food">Food</option>
            <option value="supplies">Supplies</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          minLength={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter resource title"
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
          placeholder="Describe your resource"
        />
      </div>

      <div>
        <label htmlFor="image_urls" className="block text-sm font-medium text-gray-700 mb-1">
          Image URLs
        </label>
        <input
          type="text"
          id="image_urls"
          name="image_urls"
          value={formData.image_urls}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter image URLs separated by commas"
        />
        <p className="text-xs text-gray-500 mt-1">
          Separate multiple URLs with commas
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
            Availability
          </label>
          <input
            type="text"
            id="availability"
            name="availability"
            value={formData.availability}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Weekends only"
          />
        </div>

        <div>
          <label htmlFor="meetup_flexibility" className="block text-sm font-medium text-gray-700 mb-1">
            Meetup Flexibility
          </label>
          <select
            id="meetup_flexibility"
            name="meetup_flexibility"
            value={formData.meetup_flexibility}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="home_only">Home Only</option>
            <option value="public_meetup_ok">Public Meetup OK</option>
            <option value="delivery_possible">Delivery Possible</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="pickup_instructions" className="block text-sm font-medium text-gray-700 mb-1">
          Pickup Instructions
        </label>
        <textarea
          id="pickup_instructions"
          name="pickup_instructions"
          value={formData.pickup_instructions}
          onChange={handleInputChange}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="How should people pick up this item?"
        />
      </div>

      <div>
        <label htmlFor="parking_info" className="block text-sm font-medium text-gray-700 mb-1">
          Parking Information
        </label>
        <input
          type="text"
          id="parking_info"
          name="parking_info"
          value={formData.parking_info}
          onChange={handleInputChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Parking details for pickup"
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
            initialData ? 'Update Resource' : 'Create Resource'
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