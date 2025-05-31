import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { ResourceManager } from '@/features/resources/ResourceManager';
import { LocationManager } from '@/features/location/LocationManager';
import { Resource } from '@/types';
import { eventBus } from '@/core/eventBus';
import { useAppStore } from '@/core/state';

interface ResourceFormProps {
  onComplete?: () => void;
  initialType?: 'offer' | 'request';
}

interface ResourceFormData {
  title: string;
  description: string;
  category: 'tools' | 'skills' | 'food' | 'supplies' | 'other';
  type: 'offer' | 'request';
  pickup_instructions: string;
  parking_info: string;
  meetup_flexibility: 'home_only' | 'public_meetup_ok' | 'delivery_possible';
  availability: string;
}

export function ResourceForm({ onComplete, initialType = 'offer' }: ResourceFormProps) {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<ResourceFormData>({
    defaultValues: {
      type: initialType,
      category: 'tools',
      meetup_flexibility: 'home_only',
    }
  });
  const [images, setImages] = useState<string[]>([]);
  const userLocation = useAppStore(state => state.userLocation);
  
  const onSubmit = async (data: ResourceFormData) => {
    try {
      // Create resource using the manager
      const newResource = await ResourceManager.createResource({
        ...data,
        image_urls: images,
        location: userLocation, // Use current user location
        is_active: true,
      });
      
      if (newResource) {
        // Emit event for resource creation
        eventBus.emit('resource.created', newResource);
        
        // Add to local state
        useAppStore.getState().addResource(newResource);
        
        // Call the onComplete callback if provided
        if (onComplete) onComplete();
      }
    } catch (error) {
      console.error('Error creating resource:', error);
    }
  };
  
  return (
    <Card className="animate-slide-up">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-lg">
            {initialType === 'offer' ? 'Share a Resource' : 'Request a Resource'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              I want to:
            </label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  {...register('type')}
                  value="offer"
                  className="sr-only"
                />
                <div className={`
                  border rounded-md p-3 text-center text-sm font-medium transition-colors
                  ${data.type === 'offer' ? 'bg-trust-50 border-trust-300 text-trust-800' : 'border-gray-200 hover:bg-gray-50'}
                `}>
                  Offer Something
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  {...register('type')}
                  value="request"
                  className="sr-only"
                />
                <div className={`
                  border rounded-md p-3 text-center text-sm font-medium transition-colors
                  ${data.type === 'request' ? 'bg-primary-50 border-primary-300 text-primary-800' : 'border-gray-200 hover:bg-gray-50'}
                `}>
                  Request Something
                </div>
              </label>
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Title
            </label>
            <input
              {...register('title', { required: 'Title is required' })}
              className={`w-full border ${errors.title ? 'border-red-300' : 'border-gray-200'} rounded-md p-2 text-sm`}
              placeholder="What are you sharing or requesting?"
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Category
            </label>
            <select
              {...register('category', { required: 'Category is required' })}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
            >
              <option value="tools">Tools</option>
              <option value="skills">Skills</option>
              <option value="food">Food</option>
              <option value="supplies">Supplies</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Description
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              className={`w-full border ${errors.description ? 'border-red-300' : 'border-gray-200'} rounded-md p-2 text-sm min-h-[100px]`}
              placeholder="Provide details about what you're sharing or requesting..."
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>
          
          {/* Images */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Add photos (optional)
            </label>
            <ImageUpload onImagesUploaded={setImages} />
          </div>
          
          {/* Pickup Instructions */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Pickup Instructions
            </label>
            <textarea
              {...register('pickup_instructions')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="How should people pick this up or meet you?"
            />
          </div>
          
          {/* Parking Info */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Parking Information
            </label>
            <input
              {...register('parking_info')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="Where can people park? (e.g., 'Driveway available', 'Street parking')"
            />
          </div>
          
          {/* Meetup Flexibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Meetup Options
            </label>
            <select
              {...register('meetup_flexibility')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
            >
              <option value="home_only">Pickup at my location only</option>
              <option value="public_meetup_ok">Can meet at a public location</option>
              <option value="delivery_possible">Can deliver to you</option>
            </select>
          </div>
          
          {/* Availability */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Availability
            </label>
            <input
              {...register('availability')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="When is this available? (e.g., 'Weekends only', 'Evenings after 6pm')"
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onComplete}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : data.type === 'offer' ? 'Share Resource' : 'Request Resource'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}