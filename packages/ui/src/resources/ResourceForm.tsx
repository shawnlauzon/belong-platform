import React, { useState } from 'react';
import { Button } from '@belongnetwork/components';
import type { CreateResourceData } from '@belongnetwork/types';

interface ResourceFormProps {
  onSubmit: (data: CreateResourceData) => void;
  isLoading?: boolean;
  initialData?: Partial<CreateResourceData>;
}

export function ResourceForm({ onSubmit, isLoading, initialData }: ResourceFormProps) {
  const [formData, setFormData] = useState<CreateResourceData>({
    type: initialData?.type || 'offer',
    category: initialData?.category || 'tools',
    title: initialData?.title || '',
    description: initialData?.description || '',
    image_urls: initialData?.image_urls || [],
    pickup_instructions: initialData?.pickup_instructions || '',
    parking_info: initialData?.parking_info || '',
    meetup_flexibility: initialData?.meetup_flexibility || 'home_only',
    availability: initialData?.availability || '',
    location: initialData?.location
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof CreateResourceData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="offer"
              checked={formData.type === 'offer'}
              onChange={(e) => handleChange('type', e.target.value)}
              className="mr-2"
            />
            Offer
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="request"
              checked={formData.type === 'request'}
              onChange={(e) => handleChange('type', e.target.value)}
              className="mr-2"
            />
            Request
          </label>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="tools">Tools</option>
          <option value="skills">Skills</option>
          <option value="food">Food</option>
          <option value="supplies">Supplies</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="What are you offering or requesting?"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Provide more details..."
          required
        />
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Availability
        </label>
        <input
          type="text"
          value={formData.availability}
          onChange={(e) => handleChange('availability', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="When are you available?"
        />
      </div>

      {/* Meetup Flexibility */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meetup Flexibility
        </label>
        <select
          value={formData.meetup_flexibility}
          onChange={(e) => handleChange('meetup_flexibility', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="home_only">Home only</option>
          <option value="public_meetup_ok">Public meetup OK</option>
          <option value="delivery_possible">Delivery possible</option>
        </select>
      </div>

      {/* Pickup Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pickup Instructions
        </label>
        <textarea
          value={formData.pickup_instructions}
          onChange={(e) => handleChange('pickup_instructions', e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="How should people pick this up?"
        />
      </div>

      {/* Parking Info */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Parking Info
        </label>
        <input
          type="text"
          value={formData.parking_info}
          onChange={(e) => handleChange('parking_info', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Parking instructions"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Resource'}
        </Button>
      </div>
    </form>
  );
}