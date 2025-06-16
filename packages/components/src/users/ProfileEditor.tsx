import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImageUpload } from '../shared/ImageUpload';
import { AddressAutocomplete } from '../shared/AddressAutocomplete';
import { StorageManager, Coordinates } from '@belongnetwork/core';
import { useCurrentUser, useUpdateUser } from '@belongnetwork/api';
import { getInitials } from '../utils';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  avatar_url: z.string().optional(),
  address: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UpdateUserData {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  location?: Coordinates;
}

interface ProfileEditorProps {
  onSaveComplete?: () => void;
}

export function ProfileEditor({ onSaveComplete }: ProfileEditorProps) {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUser();
  const [hasChanges, setHasChanges] = React.useState(false);
  const [currentAddress, setCurrentAddress] = React.useState<string>('');
  const [location, setLocation] = React.useState<Coordinates | null>(null);
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
  
  const isSubmitting = updateUser.isPending;
  const error = updateUser.error?.message || null;

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


  // Set default values when profile loads
  React.useEffect(() => {
    if (user) {
      const defaultValues = {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatar_url: user.avatarUrl || '',
        address: '', // Address not stored in user object
      };

      const defaultLocation = user.location || null;

      // Set form values
      setValue('firstName', defaultValues.firstName);
      setValue('lastName', defaultValues.lastName);
      setValue('avatar_url', defaultValues.avatar_url);
      setValue('address', defaultValues.address);

      // Set address and location
      setCurrentAddress(defaultValues.address);
      setLocation(defaultLocation);

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
    coordinates: Coordinates | null
  ) => {
    setCurrentAddress(address);
    setValue('address', address);
    setLocation(coordinates);
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      const updateData: UpdateUserData = {
        id: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        avatarUrl: data.avatar_url,
        location: location || undefined,
      };
      // TODO: Remove 'as any' when API hook interface is corrected
      await updateUser.mutateAsync(updateData as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      // Error is already captured by the mutation hook
      console.error('Profile update failed:', error);
    }
  };

  const handleImageUploaded = (urls: string[]) => {
    if (urls.length > 0) {
      // Delete old avatar from storage if it exists
      const oldAvatarUrl = watchedValues.avatar_url || initialValues.avatar_url;
      if (oldAvatarUrl) {
        const oldPath = StorageManager.extractPathFromUrl(oldAvatarUrl);
        if (oldPath) {
          StorageManager.deleteFile(oldPath).catch((error) => {
            console.warn('Failed to delete old avatar:', error);
          });
        }
      }

      setValue('avatar_url', urls[0]);
    }
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setLocation(newLocation);

          // Reverse geocode to get address
          try {
            const address = await reverseGeocodeToAddress(newLocation);
            if (address) {
              setCurrentAddress(address);
              setValue('address', address);
            }
          } catch (error) {
            console.warn('Reverse geocoding failed:', error);
          }
        },
        (error) => {
          let userMessage = 'Unable to get your location. ';
          if (error.code === 1) {
            userMessage +=
              'Please enable location permissions in your browser settings and try again.';
          } else if (error.code === 2) {
            userMessage += 'Location information is unavailable.';
          } else if (error.code === 3) {
            userMessage += 'Location request timed out.';
          }

          alert(userMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
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
  _coordinates: Coordinates // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string | null> {
  try {
    // This would need to be implemented with your mapbox service
    // For now, returning null as placeholder
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}