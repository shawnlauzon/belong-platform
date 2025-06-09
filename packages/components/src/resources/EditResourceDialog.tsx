import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventBus, ResourceUpdateFailedEvent } from '@belongnetwork/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ImageUpload } from '../shared/ImageUpload';
import { AddressAutocomplete } from '../shared/AddressAutocomplete';
import { LocationPicker } from '../shared/LocationPicker';
import { Resource, Coordinates } from '@belongnetwork/core';
import { logger, logComponentRender, logUserAction } from '@belongnetwork/core';

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['tools', 'skills', 'food', 'supplies', 'other']),
  type: z.enum(['offer', 'request']),
  pickup_instructions: z.string().optional(),
  parking_info: z.string().optional(),
  meetup_flexibility: z
    .enum(['home_only', 'public_meetup_ok', 'delivery_possible'])
    .optional(),
  availability: z.string().optional(),
  is_active: z.boolean(),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface EditResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  onResourceUpdated?: (resource: Resource) => void;
}

export function EditResourceDialog({
  open,
  onOpenChange,
  resource,
  onResourceUpdated,
}: EditResourceDialogProps) {
  logComponentRender('EditResourceDialog', { open, resourceId: resource?.id });

  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [addressBbox, setAddressBbox] = useState<
    [number, number, number, number] | null
  >(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'tools',
      type: 'offer',
      pickup_instructions: '',
      parking_info: '',
      meetup_flexibility: 'home_only',
      availability: '',
      is_active: true,
    },
  });

  const watchedType = watch('type');

  // Listen for resource events
  useEffect(() => {
    const unsubscribeUpdated = eventBus.on('resource.updated', (event) => {
      logger.info(
        '✅ EditResourceDialog: Resource updated successfully:',
        event.data
      );
      setIsSubmitting(false);
      setError(null);

      if (onResourceUpdated) {
        onResourceUpdated(event.data as Resource);
      }

      onOpenChange(false);
    });

    const unsubscribeFailed = eventBus.on('resource.update.failed', (event) => {
      const errorEvent = event as ResourceUpdateFailedEvent;
      logger.error(
        '❌ EditResourceDialog: Resource update failed:',
        errorEvent.data.error
      );
      setIsSubmitting(false);
      setError(errorEvent.data.error);
    });

    return () => {
      unsubscribeUpdated();
      unsubscribeFailed();
    };
  }, [onResourceUpdated, onOpenChange]);

  // Set form values when resource changes
  useEffect(() => {
    if (resource && open) {
      logger.debug(
        '📦 EditResourceDialog: Setting form values from resource:',
        resource
      );

      setValue('title', resource.title);
      setValue('description', resource.description);
      setValue('category', resource.category);
      setValue('type', resource.type);
      setValue('pickup_instructions', resource.pickup_instructions || '');
      setValue('parking_info', resource.parking_info || '');
      setValue(
        'meetup_flexibility',
        resource.meetup_flexibility || 'home_only'
      );
      setValue('availability', resource.availability || '');
      setValue('is_active', resource.is_active);

      setImages(resource.image_urls || []);
      setLocation(resource.location || null);
      setCurrentAddress(''); // We don't store the original address, so leave empty

      logUserAction('resource_edit_dialog_opened', {
        resourceId: resource.id,
        title: resource.title,
        type: resource.type,
        category: resource.category,
      });
    }
  }, [resource, open, setValue]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setImages([]);
      setLocation(null);
      setAddressBbox(null);
      setCurrentAddress('');
      setIsSubmitting(false);
      setError(null);
    }
  }, [open, reset]);

  const handleAddressChange = (
    address: string,
    coordinates: Coordinates | null,
    bbox?: [number, number, number, number]
  ) => {
    logger.debug('📍 EditResourceDialog: Address changed:', {
      address,
      coordinates,
      bbox,
    });

    setCurrentAddress(address);

    if (coordinates) {
      setLocation(coordinates);
      setAddressBbox(bbox || null);

      logUserAction('resource_edit_address_set', {
        resourceId: resource?.id,
        address,
        coordinates,
        hasBbox: !!bbox,
      });
    }
  };

  const onSubmit = async (data: ResourceFormData) => {
    if (!resource) return;

    logger.debug('📦 EditResourceDialog: Form submitted:', data);
    logUserAction('resource_update_attempt', {
      resourceId: resource.id,
      hasLocationChange: !!location,
      hasImageChange: images.length !== (resource.image_urls?.length || 0),
      newTitle: data.title,
      newType: data.type,
      newCategory: data.category,
    });

    setIsSubmitting(true);
    setError(null);

    // Emit resource update request
    eventBus.emit('resource.update.requested', {
      id: resource.id,
      ...data,
      image_urls: images,
      location: location || undefined,
    });
  };

  if (!resource) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
            <p className="text-sm text-warmgray-600">
              Update your resource details below.
            </p>
          </DialogHeader>

          <div className="grid gap-6 py-4">
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
                    ${watchedType === 'offer' ? 'bg-trust-50 border-trust-300 text-trust-800' : 'border-gray-200 hover:bg-gray-50'}
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
                    ${watchedType === 'request' ? 'bg-primary-50 border-primary-300 text-primary-800' : 'border-gray-200 hover:bg-gray-50'}
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
                {...register('title')}
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
                {...register('category')}
                className="w-full border border-gray-200 rounded-md p-2 text-sm"
                disabled={isSubmitting}
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
                {...register('description')}
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
                Photos
              </label>
              <ImageUpload
                onImagesUploaded={setImages}
                existingImages={images}
                maxImages={3}
                folder="resources"
              />
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">
                Location
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Address (Optional)
                </label>
                <AddressAutocomplete
                  value={currentAddress}
                  onChange={handleAddressChange}
                  placeholder="Update the address if needed"
                  className="w-full"
                />
                <p className="text-xs text-warmgray-500">
                  Leave empty to keep the current location
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Fine-tune Location
                </label>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  address={currentAddress}
                  addressBbox={addressBbox}
                />
              </div>
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              >
                <option value="home_only">Pickup at my location only</option>
                <option value="public_meetup_ok">
                  Can meet at a public location
                </option>
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
                disabled={isSubmitting}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register('is_active')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                disabled={isSubmitting}
              />
              <label className="text-sm font-medium text-warmgray-700">
                Resource is active and available
              </label>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
