import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImageUpload } from '../shared/ImageUpload';
import { AddressAutocomplete } from '../shared/AddressAutocomplete';
import { LocationPicker } from '../shared/LocationPicker';
import { StorageManager } from '@belongnetwork/core';
import { eventBus, useBelongStore } from '@belongnetwork/core';
import { Coordinates } from '@belongnetwork/core';
import { getInitials } from '../utils';
import { logger, logComponentRender, logUserAction } from '@belongnetwork/core';
import { mapbox } from '@belongnetwork/core'; // Import the new mapboxService

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  avatar_url: z.string().optional(),
  address: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditorProps {
  onSaveComplete?: () => void;
}

export function ProfileEditor({ onSaveComplete }: ProfileEditorProps) {
  logComponentRender('ProfileEditor');

  const { user, location } = useBelongStore((state) => state.auth);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [currentAddress, setCurrentAddress] = React.useState<string>('');
  const [initialValues, setInitialValues] = React.useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    avatar_url: '',
    address: '',
    location: { lat: 0, lng: 0 },
  });
  const [initialLocation, setInitialLocation] =
    React.useState<Coordinates | null>(null);
  const [initialAddress, setInitialAddress] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      avatar_url: '',
      address: '',
      location: { lat: 0, lng: 0 },
    },
  });

  const watchedValues = watch();

  // Listen for profile events
  useEffect(() => {
    const unsubscribeUpdated = eventBus.on('profile.updated', (event) => {
      if (event.data.userId === user?.id) {
        logger.info('✅ ProfileEditor: Profile updated successfully');
        setIsSubmitting(false);
        setError(null);

        if (onSaveComplete) {
          onSaveComplete();
        }
      }
    });

    const unsubscribeFailed = eventBus.on('profile.update.failed', (event) => {
      if (event.data.userId === user?.id) {
        logger.error(
          '❌ ProfileEditor: Profile update failed:',
          event.data.error
        );
        setIsSubmitting(false);
        setError(event.data.error);
      }
    });

    return () => {
      unsubscribeUpdated();
      unsubscribeFailed();
    };
  }, [user?.id, onSaveComplete]);

  // Set default values when profile loads
  React.useEffect(() => {
    if (user) {
      const defaultValues = {
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        avatar_url: user.avatar_url || '',
        address: user.address || '',
      };

      const defaultLocation = user.location || null;

      logger.debug('👤 ProfileEditor: Setting default values from profile:', {
        ...defaultValues,
        location: defaultLocation,
      });

      // Set form values
      setValue('firstName', defaultValues.firstName);
      setValue('lastName', defaultValues.lastName);
      setValue('avatar_url', defaultValues.avatar_url);
      setValue('address', defaultValues.address);

      // Set address
      setCurrentAddress(defaultValues.address);

      // Store initial values for change detection
      setInitialValues(defaultValues);
      setInitialLocation(defaultLocation);
      setInitialAddress(defaultValues.address);
    }
  }, [user, setValue]);

  // Check for changes whenever form values or location change
  React.useEffect(() => {
    const currentValues = getValues();

    const formHasChanges =
      currentValues.firstName !== initialValues.firstName ||
      currentValues.lastName !== initialValues.lastName ||
      currentValues.avatar_url !== initialValues.avatar_url;

    const addressHasChanges = currentAddress !== initialAddress;
    const locationHasChanges =
      JSON.stringify(location) !== JSON.stringify(initialLocation);

    const totalHasChanges =
      formHasChanges || addressHasChanges || locationHasChanges;

    if (totalHasChanges !== hasChanges) {
      setHasChanges(totalHasChanges);
      logger.debug('👤 ProfileEditor: Changes detected:', {
        formHasChanges,
        addressHasChanges,
        locationHasChanges,
        totalHasChanges,
        currentValues,
        initialValues,
        currentAddress,
        initialAddress,
        currentLocation: location,
        initialLocation,
      });
    }
  }, [
    watchedValues,
    location,
    currentAddress,
    initialValues,
    initialLocation,
    initialAddress,
    hasChanges,
    getValues,
  ]);

  const handleAddressChange = (
    address: string,
    coordinates: Coordinates | null,
    bbox?: [number, number, number, number]
  ) => {
    logger.debug('📍 ProfileEditor: Address changed:', {
      address,
      coordinates,
      bbox,
    });

    setCurrentAddress(address);
    setValue('address', address);

    if (coordinates) {
      logUserAction('address_location_set', {
        address,
        coordinates,
        hasBbox: !!bbox,
      });
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    logger.debug('👤 ProfileEditor: Form submitted:', data);
    logUserAction('profile_update_attempt', {
      userId: user.id,
      hasLocation: !!location,
      hasAddress: !!currentAddress,
      hasAvatar: !!data.avatar_url,
    });

    setIsSubmitting(true);
    setError(null);

    // Emit profile update request
    eventBus.emit('profile.update.requested', {
      userId: user.id,
      metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`,
        avatar_url: data.avatar_url,
        location,
        address: currentAddress,
      },
    });
  };

  const handleImageUploaded = (urls: string[]) => {
    logger.debug('👤 ProfileEditor: Images uploaded to storage:', {
      count: urls.length,
    });

    if (urls.length > 0) {
      // Delete old avatar from storage if it exists
      const oldAvatarUrl = watchedValues.avatar_url || initialValues.avatar_url;
      if (oldAvatarUrl) {
        const oldPath = StorageManager.extractPathFromUrl(oldAvatarUrl);
        if (oldPath) {
          StorageManager.deleteFile(oldPath).catch((error) => {
            logger.warn(
              '⚠️ ProfileEditor: Failed to delete old avatar:',
              error
            );
          });
        }
      }

      setValue('avatar_url', urls[0]);
      logUserAction('profile_image_uploaded_to_storage', { url: urls[0] });
    }
  };

  const handleUseCurrentLocation = () => {
    logUserAction('location_request_from_profile_editor');

    if ('geolocation' in navigator) {
      logger.debug('📍 ProfileEditor: Requesting geolocation permission...');

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          logger.info('📍 ProfileEditor: Got current location:', newLocation);
          logUserAction('location_granted_from_profile_editor', newLocation);

          // Reverse geocode to get address
          try {
            const address = await reverseGeocodeToAddress(newLocation);
            if (address) {
              logger.info('📍 ProfileEditor: Reverse geocoded address:', {
                address,
              });
              setCurrentAddress(address);
              setValue('address', address);
            }
          } catch (error) {
            logger.warn('📍 ProfileEditor: Reverse geocoding failed:', error);
          }
        },
        (error) => {
          logger.error('❌ ProfileEditor: Geolocation error:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3,
          });

          let userMessage = 'Unable to get your location. ';
          if (error.code === 1) {
            userMessage +=
              'Please enable location permissions in your browser settings and try again.';
          } else if (error.code === 2) {
            userMessage += 'Location information is unavailable.';
          } else if (error.code === 3) {
            userMessage += 'Location request timed out.';
          }

          logUserAction('location_denied_from_profile_editor', {
            error: error.message,
            code: error.code,
            userMessage,
          });

          alert(userMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      logger.warn('📍 ProfileEditor: Geolocation not available');
      alert('Geolocation is not supported by this browser.');
    }
  };

  const getCurrentAvatarUrl = () => {
    return watchedValues.avatar_url || initialValues.avatar_url;
  };

  const getDisplayName = () => {
    const firstName = watchedValues.firstName || initialValues.firstName;
    const lastName = watchedValues.lastName || initialValues.lastName;
    return `${firstName} ${lastName}`.trim() || 'User';
  };

  const getAvatarInitials = () => {
    const firstName = watchedValues.firstName || initialValues.firstName;
    const lastName = watchedValues.lastName || initialValues.lastName;
    return getInitials(firstName, lastName, 'User');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <input
                type="text"
                {...register('firstName')}
                className="w-full border rounded-md p-2"
                placeholder="Enter your first name"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                type="text"
                {...register('lastName')}
                className="w-full border rounded-md p-2"
                placeholder="Enter your last name"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Profile Picture</label>

            {/* Current Avatar Display */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-gray-200">
                <AvatarImage
                  src={getCurrentAvatarUrl()}
                  alt={getDisplayName()}
                />
                <AvatarFallback className="text-lg">
                  {getAvatarInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-warmgray-600 mb-2">
                  {getCurrentAvatarUrl()
                    ? 'Current profile picture'
                    : 'No profile picture set'}
                </p>
                <ImageUpload
                  onImagesUploaded={handleImageUploaded}
                  maxImages={1}
                  existingImages={
                    getCurrentAvatarUrl() ? [getCurrentAvatarUrl()!] : []
                  }
                  folder="avatars"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Location</label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-warmgray-600">
                  Address
                </label>
                {currentAddress && (
                  <span className="text-sm text-warmgray-600">
                    Current: {currentAddress}
                  </span>
                )}
              </div>
              <AddressAutocomplete
                value={currentAddress}
                onChange={handleAddressChange}
                placeholder="Start typing your address (e.g., 5305 Oak St...)"
                className="w-full"
              />
              <p className="text-xs text-warmgray-500">
                Start typing your address to see suggestions. This helps us show
                you nearby resources and neighbors.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-warmgray-600">
                  Precise Location (Optional)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                  disabled={isSubmitting}
                >
                  Use Current Location
                </Button>
              </div>

              {/* <LocationPicker
                value={location}
                onChange={setLocation}
                address={currentAddress}
                addressBbox={addressBbox}
              />
              <p className="text-xs text-warmgray-500">
                Click on the map to fine-tune your exact location, or use the
                "Use Current Location" button.
              </p> */}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSaveComplete}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasChanges}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Reverse geocoding function to get address from coordinates
async function reverseGeocodeToAddress(
  coordinates: Coordinates
): Promise<string | null> {
  try {
    logger.debug(
      '📍 reverseGeocodeToAddress: Reverse geocoding coordinates:',
      coordinates
    );

    const address = await mapbox.reverseGeocode(coordinates);

    if (address) {
      logger.debug('📍 reverseGeocodeToAddress: Found address:', { address });
    } else {
      logger.debug(
        '📍 reverseGeocodeToAddress: No address found for coordinates'
      );
    }

    return address;
  } catch (error) {
    logger.error('❌ reverseGeocodeToAddress: Error:', error);
    return null;
  }
}
