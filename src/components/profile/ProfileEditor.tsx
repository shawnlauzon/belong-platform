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
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditor() {
  logComponentRender('ProfileEditor');
  
  const { user } = useAuth();
  const { data: profile, updateProfile } = useProfile(user?.id);
  const [location, setLocation] = React.useState<Coordinates | null>(
    profile?.user_metadata?.location || null
  );

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.user_metadata?.first_name || '',
      lastName: profile?.user_metadata?.last_name || '',
      avatar_url: profile?.user_metadata?.avatar_url || '',
    }
  });

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
      hasLocation: !!location
    });

    await updateProfile({
      first_name: data.firstName,
      last_name: data.lastName,
      full_name: `${data.firstName} ${data.lastName}`,
      avatar_url: data.avatar_url,
      location,
    });
    
    logUserAction('profile_update_success', { userId: user.id });
  };

  const handleImageUploaded = (urls: string[]) => {
    logger.debug('👤 ProfileEditor: Images uploaded:', { count: urls.length });
    
    if (urls.length > 0) {
      // In a real app, we would upload to storage and get a permanent URL
      // For now, we'll just use the first URL
      register('avatar_url').onChange({
        target: { value: urls[0] }
      });
      
      logUserAction('profile_image_uploaded', { url: urls[0] });
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Location</label>
            <LocationPicker 
              value={location}
              onChange={setLocation}
            />
            <p className="text-xs text-warmgray-500">
              This helps us show you nearby resources and neighbors
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}