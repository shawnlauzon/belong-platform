import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { LocationPicker } from '@/components/shared/LocationPicker';
import { Coordinates } from '@/types';
import { getInitials } from '@/lib/utils';
import { logger, logComponentRender, logUserAction } from '@/lib/logger';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  avatar_url: z.string().optional(),
  zipCode: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditorProps {
  onSaveComplete?: () => void;
}

export function ProfileEditor({ onSaveComplete }: ProfileEditorProps) {
  logComponentRender('ProfileEditor');
  
  const { user } = useAuth();
  const { data: profile, updateProfile } = useProfile(user?.id);
  const [location, setLocation] = React.useState<Coordinates | null>(
    profile?.user_metadata?.location || null
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [currentZipCode, setCurrentZipCode] = React.useState<string>('');
  const [displayedZipCode, setDisplayedZipCode] = React.useState<string>('');
  const [initialValues, setInitialValues] = React.useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    avatar_url: '',
    zipCode: '',
  });
  const [initialLocation, setInitialLocation] = React.useState<Coordinates | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, getValues } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      avatar_url: '',
      zipCode: '',
    }
  });

  const watchedValues = watch();

  // Set default values when profile loads
  React.useEffect(() => {
    if (profile?.user_metadata) {
      const metadata = profile.user_metadata;
      
      const defaultValues = {
        firstName: metadata.first_name || '',
        lastName: metadata.last_name || '',
        avatar_url: metadata.avatar_url || '',
        zipCode: metadata.zip_code || '',
      };

      const defaultLocation = metadata.location || null;
      
      logger.debug('👤 ProfileEditor: Setting default values from profile:', {
        ...defaultValues,
        location: defaultLocation
      });

      // Set form values
      setValue('firstName', defaultValues.firstName);
      setValue('lastName', defaultValues.lastName);
      setValue('avatar_url', defaultValues.avatar_url);
      setValue('zipCode', defaultValues.zipCode);
      
      // Set location and zip code display
      setLocation(defaultLocation);
      setCurrentZipCode(defaultValues.zipCode);
      setDisplayedZipCode(defaultValues.zipCode);
      
      // Store initial values for change detection
      setInitialValues(defaultValues);
      setInitialLocation(defaultLocation);
    }
  }, [profile, setValue]);

  // Check for changes whenever form values or location change
  React.useEffect(() => {
    const currentValues = getValues();
    
    const formHasChanges = 
      currentValues.firstName !== initialValues.firstName ||
      currentValues.lastName !== initialValues.lastName ||
      currentValues.avatar_url !== initialValues.avatar_url ||
      displayedZipCode !== initialValues.zipCode;
    
    const locationHasChanges = JSON.stringify(location) !== JSON.stringify(initialLocation);
    
    const totalHasChanges = formHasChanges || locationHasChanges;
    
    if (totalHasChanges !== hasChanges) {
      setHasChanges(totalHasChanges);
      logger.debug('👤 ProfileEditor: Changes detected:', {
        formHasChanges,
        locationHasChanges,
        totalHasChanges,
        currentValues,
        initialValues,
        currentLocation: location,
        initialLocation,
        displayedZipCode,
        initialZipCode: initialValues.zipCode
      });
    }
  }, [watchedValues, location, displayedZipCode, initialValues, initialLocation, hasChanges, getValues]);

  const handleZipCodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const zipCode = (e.target as HTMLInputElement).value.trim();
      
      if (zipCode && zipCode.length === 5) {
        logger.debug('📍 ProfileEditor: Processing zip code on Enter:', { zipCode });
        
        const coordinates = getCoordinatesFromZipCode(zipCode);
        if (coordinates) {
          logger.info('📍 ProfileEditor: Updated location from zip code:', {
            zipCode,
            coordinates
          });
          
          // Update the displayed zip code and location
          setDisplayedZipCode(zipCode);
          setCurrentZipCode(zipCode);
          setLocation(coordinates);
          
          // Update the form value to match
          setValue('zipCode', zipCode);
          
          logUserAction('zip_code_location_set', { zipCode, coordinates });
        } else {
          logger.warn('📍 ProfileEditor: Unknown zip code:', { zipCode });
          alert(`Sorry, we don't have location data for zip code ${zipCode}. Please try a different zip code or use the "Use Current Location" button.`);
        }
      } else if (zipCode.length > 0 && zipCode.length !== 5) {
        alert('Please enter a valid 5-digit zip code.');
      }
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    logger.debug('👤 ProfileEditor: Form submitted:', data);
    logUserAction('profile_update_attempt', {
      userId: user.id,
      hasLocation: !!location,
      hasZipCode: !!displayedZipCode
    });

    setIsSubmitting(true);

    try {
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`,
        avatar_url: data.avatar_url,
        location,
        zip_code: displayedZipCode, // Use the displayed zip code, not the form input
      });
      
      logUserAction('profile_update_success', { userId: user.id });
      logger.info('✅ ProfileEditor: Profile updated successfully');
      
      // Call the completion callback to return to view mode
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (error) {
      logger.error('❌ ProfileEditor: Error updating profile:', error);
      logUserAction('profile_update_error', { userId: user.id, error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUploaded = (urls: string[]) => {
    logger.debug('👤 ProfileEditor: Images uploaded:', { count: urls.length });
    
    if (urls.length > 0) {
      // For now, we'll store the blob URL directly
      // In a production app, you would upload to Supabase Storage first
      setValue('avatar_url', urls[0]);
      logUserAction('profile_image_uploaded', { url: urls[0] });
    }
  };

  const handleUseCurrentLocation = () => {
    logUserAction('location_request_from_profile_editor');
    
    if ('geolocation' in navigator) {
      logger.debug('📍 ProfileEditor: Requesting geolocation permission...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          logger.info('📍 ProfileEditor: Got current location:', newLocation);
          logUserAction('location_granted_from_profile_editor', newLocation);
          
          setLocation(newLocation);
          
          // Don't estimate zip code anymore - removed as requested
        },
        (error) => {
          logger.error('❌ ProfileEditor: Geolocation error:', {
            code: error.code,
            message: error.message,
            PERMISSION_DENIED: error.code === 1,
            POSITION_UNAVAILABLE: error.code === 2,
            TIMEOUT: error.code === 3
          });
          
          let userMessage = 'Unable to get your location. ';
          if (error.code === 1) {
            userMessage += 'Please enable location permissions in your browser settings and try again.';
          } else if (error.code === 2) {
            userMessage += 'Location information is unavailable.';
          } else if (error.code === 3) {
            userMessage += 'Location request timed out.';
          }
          
          logUserAction('location_denied_from_profile_editor', { 
            error: error.message,
            code: error.code,
            userMessage 
          });
          
          alert(userMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
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
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <input
                type="text"
                {...register('lastName')}
                className="w-full border rounded-md p-2"
                placeholder="Enter your last name"
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Profile Picture</label>
            
            {/* Current Avatar Display */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-gray-200">
                <AvatarImage src={getCurrentAvatarUrl()} alt={getDisplayName()} />
                <AvatarFallback className="text-lg">{getAvatarInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-warmgray-600 mb-2">
                  {getCurrentAvatarUrl() ? 'Current profile picture' : 'No profile picture set'}
                </p>
                <ImageUpload 
                  onImagesUploaded={handleImageUploaded} 
                  maxImages={1}
                  existingImages={getCurrentAvatarUrl() ? [getCurrentAvatarUrl()] : []}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Location</label>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-warmgray-600">Zip Code</label>
                {displayedZipCode && (
                  <div className="text-sm font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                    Current: {displayedZipCode}
                  </div>
                )}
              </div>
              <input
                type="text"
                {...register('zipCode')}
                className="w-full border rounded-md p-2"
                placeholder="Enter your zip code (e.g., 78701)"
                maxLength={5}
                onKeyPress={handleZipCodeKeyPress}
              />
              <p className="text-xs text-warmgray-500">
                Enter your zip code and press Enter to set your approximate location
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-warmgray-600">Precise Location (Optional)</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseCurrentLocation}
                >
                  Use Current Location
                </Button>
              </div>
              
              <LocationPicker 
                value={location}
                onChange={setLocation}
                zipCode={displayedZipCode}
              />
              <p className="text-xs text-warmgray-500">
                This helps us show you nearby resources and neighbors. You can also just use your zip code above.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onSaveComplete}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Simple zip code to coordinates mapping for common areas
// In a production app, you'd use a proper geocoding service
function getCoordinatesFromZipCode(zipCode: string): Coordinates | null {
  const zipCodeMap: Record<string, Coordinates> = {
    // Austin, TX area
    '78701': { lat: 30.2672, lng: -97.7431 },
    '78702': { lat: 30.2500, lng: -97.7300 },
    '78703': { lat: 30.2800, lng: -97.7600 },
    '78704': { lat: 30.2400, lng: -97.7500 },
    '78705': { lat: 30.2900, lng: -97.7400 },
    '78731': { lat: 30.3200, lng: -97.7800 },
    '78732': { lat: 30.3500, lng: -97.8200 },
    '78745': { lat: 30.2200, lng: -97.7800 },
    '78746': { lat: 30.2700, lng: -97.8000 },
    '78748': { lat: 30.2000, lng: -97.8000 },
    '78749': { lat: 30.2300, lng: -97.8200 },
    '78750': { lat: 30.4000, lng: -97.7500 },
    '78751': { lat: 30.3100, lng: -97.7200 },
    '78752': { lat: 30.3000, lng: -97.7000 },
    '78753': { lat: 30.3300, lng: -97.6800 },
    '78754': { lat: 30.3400, lng: -97.6500 },
    '78756': { lat: 30.3200, lng: -97.7300 },
    '78757': { lat: 30.3500, lng: -97.7300 },
    '78758': { lat: 30.3800, lng: -97.7000 },
    '78759': { lat: 30.4000, lng: -97.7200 },
    
    // Add more zip codes as needed
    // Major cities
    '10001': { lat: 40.7505, lng: -73.9934 }, // NYC
    '90210': { lat: 34.0901, lng: -118.4065 }, // Beverly Hills
    '94102': { lat: 37.7849, lng: -122.4094 }, // San Francisco
    '60601': { lat: 41.8827, lng: -87.6233 }, // Chicago
    '33101': { lat: 25.7743, lng: -80.1937 }, // Miami
  };

  return zipCodeMap[zipCode] || null;
}