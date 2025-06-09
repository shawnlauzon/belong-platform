import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ImageUpload } from '../shared/ImageUpload';
import {
  eventBus,
  logComponentRender,
  logger,
  useBelongStore,
  User,
} from '@belongnetwork/core';
import { logUserAction } from '@belongnetwork/core';

const thanksSchema = z.object({
  message: z.string().min(5, 'Message must be at least 5 characters'),
  impact_description: z.string().optional(),
});

type ThanksFormData = z.infer<typeof thanksSchema>;

interface ThanksFormProps {
  resourceId: string;
  recipientId: string;
  recipient?: User;
  onComplete?: () => void;
  resourceTitle?: string;
}

export function ThanksForm({
  resourceId,
  recipientId,
  recipient,
  onComplete,
  resourceTitle,
}: ThanksFormProps) {
  logComponentRender('ThanksForm', { resourceId, recipientId, resourceTitle });

  const currentUser = useBelongStore((state) => state.auth.user);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ThanksFormData>({
    resolver: zodResolver(thanksSchema),
  });

  // Listen for thanks events
  useEffect(() => {
    const unsubscribeCreated = eventBus.on('thanks.created', () => {
      logger.info('✅ ThanksForm: Thanks created successfully');
      setIsSubmitting(false);
      setError(null);

      // Reset form
      reset();
      setImages([]);

      // Call completion callback
      if (onComplete) {
        onComplete();
      }
    });

    const unsubscribeFailed = eventBus.on('thanks.create.failed', (event) => {
      logger.error('❌ ThanksForm: Thanks creation failed:', event.data.error);
      setIsSubmitting(false);
      setError(event.data.error);
    });

    return () => {
      unsubscribeCreated();
      unsubscribeFailed();
    };
  }, [onComplete, reset]);

  const onSubmit = async (data: ThanksFormData) => {
    if (!currentUser) {
      logger.error('❌ ThanksForm: User not authenticated');
      return;
    }

    logger.debug('🙏 ThanksForm: Submitting thanks:', {
      resourceId,
      recipientId,
      message: data.message,
      hasImpact: !!data.impact_description,
      imageCount: images.length,
    });

    logUserAction('thanks_create_attempt', {
      resourceId,
      recipientId,
      resourceTitle,
      messageLength: data.message.length,
      hasImpact: !!data.impact_description,
      imageCount: images.length,
    });

    setIsSubmitting(true);
    setError(null);

    // Emit thanks creation request
    eventBus.emit('thanks.create.requested', {
      to_user_id: recipientId,
      resource_id: resourceId,
      message: data.message,
      image_urls: images,
      impact_description: data.impact_description,
    });
  };

  return (
    <Card className="animate-slide-up">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-lg">Send Thanks</CardTitle>
          {recipient && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar>
                <AvatarImage src={recipient.avatar_url || undefined} />
                <AvatarFallback>{recipient.first_name}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{recipient.first_name}</div>
                {resourceTitle && (
                  <div className="text-xs text-warmgray-500">
                    for "{resourceTitle}"
                  </div>
                )}
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Share your gratitude
            </label>
            <textarea
              {...register('message')}
              className={`w-full border ${errors.message ? 'border-red-300' : 'border-gray-200'} rounded-md p-2 text-sm min-h-[100px]`}
              placeholder="Express how this helped you or made you feel..."
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="text-xs text-red-500">{errors.message.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              How did this impact you?
            </label>
            <textarea
              {...register('impact_description')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="Optional: Share how this made a difference for you..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Add photos (optional)
            </label>
            <ImageUpload
              onImagesUploaded={setImages}
              existingImages={images}
              maxImages={3}
              folder="thanks"
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
            {isSubmitting ? 'Sending...' : 'Send Thanks'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
