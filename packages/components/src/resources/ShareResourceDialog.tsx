import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageUpload } from '~/shared/ImageUpload';
import { AuthDialog } from '~/users/AuthDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/ui/dialog';
import { Button } from '~/ui/button';
import { eventBus, useBelongStore } from '@belongnetwork/core';

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['tools', 'skills', 'food', 'supplies', 'other']),
  meetup_flexibility: z.enum([
    'home_only',
    'public_meetup_ok',
    'delivery_possible',
  ]),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface ShareResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareResourceDialog({
  open,
  onOpenChange,
}: ShareResourceDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      category: 'tools',
      meetup_flexibility: 'home_only',
    },
  });
  const [images, setImages] = useState<string[]>([]);
  const userLocation = useBelongStore((state) => state.auth.location);
  const user = useBelongStore((state) => state.auth.user);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  React.useEffect(() => {
    const unsubscribe = eventBus.on('resource.created', () => {
      reset();
      setImages([]);
      onOpenChange(false);
    });

    return unsubscribe;
  }, [reset, onOpenChange]);

  const onSubmit = async (data: ResourceFormData) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    eventBus.emit('resource.create.requested', {
      ...data,
      type: 'offer',
      creator_id: user.id,
      image_urls: images,
      location: userLocation,
      is_active: true,
    });
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
                  <option value="tools">Tools</option>
                  <option value="skills">Skills</option>
                  <option value="food">Food</option>
                  <option value="supplies">Supplies</option>
                  <option value="other">Other</option>
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
                  {...register('meetup_flexibility')}
                  className="w-full border rounded-md p-2"
                >
                  <option value="home_only">Pickup at my location only</option>
                  <option value="public_meetup_ok">
                    Can meet at a public location
                  </option>
                  <option value="delivery_possible">Delivery possible</option>
                </select>
                {errors.meetup_flexibility && (
                  <p className="text-xs text-red-500">
                    {errors.meetup_flexibility.message}
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
