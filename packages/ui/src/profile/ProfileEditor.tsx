import React, { useState } from 'react';
import { useUpdateProfile } from '@belongnetwork/api';
import { Button } from '@belongnetwork/components';
import type { UpdateProfileData, User } from '@belongnetwork/types';

interface ProfileEditorProps {
  user: User;
  onSuccess?: () => void;
}

export function ProfileEditor({ user, onSuccess }: ProfileEditorProps) {
  const [formData, setFormData] = useState<UpdateProfileData>({
    first_name: user.first_name,
    last_name: user.last_name,
    avatar_url: user.avatar_url
  });

  const updateProfileMutation = useUpdateProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData, {
      onSuccess: () => {
        onSuccess?.();
      }
    });
  };

  const handleChange = (field: keyof UpdateProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          First Name
        </label>
        <input
          type="text"
          value={formData.first_name || ''}
          onChange={(e) => handleChange('first_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="First name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Last Name
        </label>
        <input
          type="text"
          value={formData.last_name || ''}
          onChange={(e) => handleChange('last_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Last name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Avatar URL
        </label>
        <input
          type="url"
          value={formData.avatar_url || ''}
          onChange={(e) => handleChange('avatar_url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      {updateProfileMutation.error && (
        <div className="text-red-600 text-sm">
          {updateProfileMutation.error.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={updateProfileMutation.isPending}>
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}