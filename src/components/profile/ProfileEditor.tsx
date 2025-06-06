import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useProfile';
import { LocationPicker } from '@/components/shared/LocationPicker';
import { Coordinates } from '@/types';
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

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      avatar_url: '',
      zipCode: '',
    }
  });

  const zipCode = watch('zipCode');

  // Set default values when profile loads
  React.useEffect(() => {
    if (profile?.user_metadata) {
      const metadata = profile.user_metadata;
      
      logger.debug('👤 ProfileEditor: Setting default values from profile:', {
        firstName: metadata.first_name,
        lastName: metadata.last_name,
        avatarUrl: metadata.avatar_url,
        location: metadata.location
      });

      setValue('firstName', metadata.first_name || '');
      setValue('lastName', metadata.last_name || '');
      setValue('avatar_url', metadata.avatar_url || '');
      setLocation(metadata.location || null);
    }
  }, [profile, setValue]);

  // Handle zip code changes to update map location
  React.useEffect(() => {
    const updateLocationFromZipCode = async () => {
      if (zipCode && zipCode.length === 5) {
        try {
          logger.debug('📍 ProfileEditor: Looking up zip code:', { zipCode });
          
          // Use a geocoding service to convert zip code to coordinates
          // For now, we'll use a simple approximation for common zip codes
          const zipCodeCoordinates = getCoordinatesFromZipCode(zipCode);
          
          if (zipCodeCoordinates) {
            logger.info('📍 ProfileEditor: Updated location from zip code:', {
              zipCode,
              coordinates: zipCodeCoordinates
            });
            setLocation(zipCodeCoordinates);
          }
        } catch (error) {
          logger.error('❌ ProfileEditor: Error looking up zip code:', error);
        }
      }
    };

    updateLocationFromZipCode();
  }, [zipCode]);

  React.useEffect(() => {
    logger.debug('👤 ProfileEditor: Profile data loaded:', {
      hasProfile: !!profile,
      hasMetadata: !!profile?.user_metadata,
      firstName: profile?.user_metadata?.first_name,
      lastName: profile?.user_metadata?.last_name
    });
  }, [profile]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    logger.debug('👤 ProfileEditor: Form submitted:', data);
    logUserAction('profile_update_attempt', {
      userId: user.id,
      hasLocation: !!location,
      hasZipCode: !!data.zipCode
    });

    setIsSubmitting(true);

    try {
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`,
        avatar_url: data.avatar_url,
        location,
        zip_code: data.zipCode,
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
      setValue('avatar_url', urls[0]);
      logUserAction('profile_image_uploaded', { url: urls[0] });
    }
  };

  const handleUseCurrentLocation = () => {
    logUserAction('location_request_from_profile_editor');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          logger.info('📍 ProfileEditor: Got current location:', newLocation);
          logUserAction('location_granted_from_profile_editor', newLocation);
          
          setLocation(newLocation);
        },
        (error) => {
          logger.error('❌ ProfileEditor: Error getting location:', error);
          logUserAction('location_denied_from_profile_editor', { error: error.message });
        }
      );
    } else {
      logger.warn('📍 ProfileEditor: Geolocation not available');
    }
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Picture</label>
            <ImageUpload 
              onImagesUploaded={handleImageUploaded} 
              maxImages={1} 
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium">Location</label>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-warmgray-600">Zip Code</label>
              <input
                type="text"
                {...register('zipCode')}
                className="w-full border rounded-md p-2"
                placeholder="Enter your zip code (e.g., 78701)"
                maxLength={5}
              />
              <p className="text-xs text-warmgray-500">
                Enter your zip code to set your approximate location
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
            <Button type="submit" disabled={isSubmitting}>
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