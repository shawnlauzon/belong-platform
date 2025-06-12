import React, { useState } from 'react';
import { Button } from '@belongnetwork/components';
import type { CreateThanksData } from '@belongnetwork/types';

interface ThanksFormProps {
  onSubmit: (data: CreateThanksData) => void;
  isLoading?: boolean;
  resourceId?: string;
  toUserId?: string;
}

export function ThanksForm({ onSubmit, isLoading, resourceId, toUserId }: ThanksFormProps) {
  const [formData, setFormData] = useState<CreateThanksData>({
    to_user_id: toUserId || '',
    resource_id: resourceId || '',
    message: '',
    image_urls: [],
    impact_description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: keyof CreateThanksData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Thank You Message *
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => handleChange('message', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Express your gratitude..."
          required
        />
      </div>

      {/* Impact Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Impact Description
        </label>
        <textarea
          value={formData.impact_description}
          onChange={(e) => handleChange('impact_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="How did this help you or your community?"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Thanks'}
        </Button>
      </div>
    </form>
  );
}