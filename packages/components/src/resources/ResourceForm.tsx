import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ImageUpload } from '../shared/ImageUpload';
import { useCurrentUser, useCreateResource } from '@belongnetwork/api';
import { ResourceCategory, MeetupFlexibility } from '@belongnetwork/types';

interface ResourceFormProps {
  onComplete?: () => void;
  initialType?: 'offer' | 'request';
  communityId: string;
}

interface ResourceFormData {
  title: string;
  description: string;
  category: ResourceCategory;
  type: 'offer' | 'request';
  pickupInstructions?: string;
  parkingInfo?: string;
  meetupFlexibility?: MeetupFlexibility;
  availability?: string;
  communityId: string;
}

export function ResourceForm({
  onComplete,
  initialType = 'offer',
  communityId,
}: ResourceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResourceFormData>({
    defaultValues: {
      type: initialType,
      category: ResourceCategory.TOOLS,
      meetupFlexibility: MeetupFlexibility.HOME_ONLY,
    },
  });
  const [images, setImages] = useState<string[]>([]);
  const { data: currentUser } = useCurrentUser();
  const createResource = useCreateResource();
  const data = watch();
  
  const isSubmitting = createResource.isPending;
  const error = createResource.error?.message || null;


  const onSubmit = async (data: ResourceFormData) => {
    if (!currentUser) {
      return;
    }

    try {
      await createResource.mutateAsync({
        ...data,
        communityId,
        imageUrls: images,
        location: currentUser.location ?? undefined,
        isActive: true,
      });

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      // Error is handled by the hook and displayed via the error state
      console.error('Failed to create resource:', error);
    }
  };

  return (
    <Card className="animate-slide-up">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-lg">
            {initialType === 'offer'
              ? 'Share a Resource'
              : 'Request a Resource'}
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
                  disabled={isSubmitting}
                />
                <div
                  className={`
                  border rounded-md p-3 text-center text-sm font-medium transition-colors
                  ${data.type === 'offer' ? 'bg-trust-50 border-trust-300 text-trust-800' : 'border-gray-200 hover:bg-gray-50'}
                `}
                >
                  Offer Something
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  {...register('type')}
                  value="request"
                  className="sr-only"
                  disabled={isSubmitting}
                />
                <div
                  className={`
                  border rounded-md p-3 text-center text-sm font-medium transition-colors
                  ${data.type === 'request' ? 'bg-primary-50 border-primary-300 text-primary-800' : 'border-gray-200 hover:bg-gray-50'}
                `}
                >
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              <option value={ResourceCategory.TOOLS}>Tools</option>
              <option value={ResourceCategory.SKILLS}>Skills</option>
              <option value={ResourceCategory.FOOD}>Food</option>
              <option value={ResourceCategory.SUPPLIES}>Supplies</option>
              <option value={ResourceCategory.OTHER}>Other</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Description
            </label>
            <textarea
              {...register('description', {
                required: 'Description is required',
              })}
              className={`w-full border ${errors.description ? 'border-red-300' : 'border-gray-200'} rounded-md p-2 text-sm min-h-[100px]`}
              placeholder="Provide details about what you're sharing or requesting..."
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Images */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Add photos (optional)
            </label>
            <ImageUpload onImagesUploaded={setImages} folder="resources" />
          </div>

          {/* Pickup Instructions */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Pickup Instructions
            </label>
            <textarea
              {...register('pickupInstructions')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="How should people pick this up or meet you?"
              disabled={isSubmitting}
            />
          </div>

          {/* Parking Info */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Parking Information
            </label>
            <input
              {...register('parkingInfo')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="Where can people park? (e.g., 'Driveway available', 'Street parking')"
              disabled={isSubmitting}
            />
          </div>

          {/* Meetup Flexibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Meetup Options
            </label>
            <select
              {...register('meetupFlexibility')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              disabled={isSubmitting}
            >
              <option value={MeetupFlexibility.HOME_ONLY}>Pickup at my location only</option>
              <option value={MeetupFlexibility.PUBLIC_MEETUP_OK}>
                Can meet at a public location
              </option>
              <option value={MeetupFlexibility.DELIVERY_POSSIBLE}>Can deliver to you</option>
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
              disabled={isSubmitting}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onComplete}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Submitting...'
              : data.type === 'offer'
                ? 'Share Resource'
                : 'Request Resource'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
