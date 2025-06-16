import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageUpload } from '../shared/ImageUpload';
import { AuthDialog } from '../users/AuthDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useCurrentUser, useCreateResource } from '@belongnetwork/api';
import { ResourceCategory, MeetupFlexibility } from '@belongnetwork/types';

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.nativeEnum(ResourceCategory),
  meetupFlexibility: z.nativeEnum(MeetupFlexibility),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface ShareResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
}

export function ShareResourceDialog({
  open,
  onOpenChange,
  communityId,
}: ShareResourceDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      category: ResourceCategory.TOOLS,
      meetupFlexibility: MeetupFlexibility.HOME_ONLY,
    },
  });
  const [images, setImages] = useState<string[]>([]);
  const { data: user } = useCurrentUser();
  const createResource = useCreateResource();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const onSubmit = async (data: ResourceFormData) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    try {
      await createResource.mutateAsync({
        ...data,
        type: 'offer', // Default to offer for share dialog
        communityId,
        imageUrls: images,
        location: user.location ?? undefined,
        isActive: true,
      });
      
      // Reset form and close dialog on success
      reset();
      setImages([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create resource:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] bg-white">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Share Something with Your Community</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  {...register('title')}
                  className="w-full border rounded-md p-2"
                  placeholder="What are you sharing?"
                />
                {errors.title && (
                  <p className="text-xs text-red-500">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  {...register('category')}
                  className="w-full border rounded-md p-2"
                >
                  <option value={ResourceCategory.TOOLS}>Tools</option>
                  <option value={ResourceCategory.SKILLS}>Skills</option>
                  <option value={ResourceCategory.FOOD}>Food</option>
                  <option value={ResourceCategory.SUPPLIES}>Supplies</option>
                  <option value={ResourceCategory.OTHER}>Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  {...register('description')}
                  className="w-full border rounded-md p-2 min-h-[100px]"
                  placeholder="Describe what you're sharing..."
                />
                {errors.description && (
                  <p className="text-xs text-red-500">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Meetup Preference</label>
                <select
                  {...register('meetupFlexibility')}
                  className="w-full border rounded-md p-2"
                >
                  <option value={MeetupFlexibility.HOME_ONLY}>Pickup at my location only</option>
                  <option value={MeetupFlexibility.PUBLIC_MEETUP_OK}>
                    Can meet at a public location
                  </option>
                  <option value={MeetupFlexibility.DELIVERY_POSSIBLE}>Delivery possible</option>
                </select>
                {errors.meetupFlexibility && (
                  <p className="text-xs text-red-500">
                    {errors.meetupFlexibility.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Photos</label>
                <ImageUpload onImagesUploaded={setImages} maxImages={3} />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sharing...' : 'Share Resource'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
}
