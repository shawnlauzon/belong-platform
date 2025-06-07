import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useCreateThanks } from '@/hooks/useThanks';
import { useAuth } from '@/lib/auth';
import { Member } from '@/types';
import { logger, logComponentRender, logUserAction } from '@/lib/logger';

const thanksSchema = z.object({
  message: z.string().min(5, 'Message must be at least 5 characters'),
  impact_description: z.string().optional(),
});

type ThanksFormData = z.infer<typeof thanksSchema>;

interface ThanksFormProps {
  resourceId: string;
  recipientId: string;
  recipient?: Member;
  onComplete?: () => void;
  resourceTitle?: string;
}

export function ThanksForm({ 
  resourceId, 
  recipientId, 
  recipient,
  onComplete, 
  resourceTitle 
}: ThanksFormProps) {
  logComponentRender('ThanksForm', { resourceId, recipientId, resourceTitle });
  
  const { user } = useAuth();
  const [images, setImages] = useState<string[]>([]);
  const createThanksMutation = useCreateThanks();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ThanksFormData>({
    resolver: zodResolver(thanksSchema),
  });
  
  const onSubmit = async (data: ThanksFormData) => {
    if (!user) {
      logger.error('❌ ThanksForm: User not authenticated');
      return;
    }

    logger.debug('🙏 ThanksForm: Submitting thanks:', {
      resourceId,
      recipientId,
      message: data.message,
      hasImpact: !!data.impact_description,
      imageCount: images.length
    });

    logUserAction('thanks_create_attempt', {
      resourceId,
      recipientId,
      resourceTitle,
      messageLength: data.message.length,
      hasImpact: !!data.impact_description,
      imageCount: images.length
    });
    
    try {
      await createThanksMutation.mutateAsync({
        to_user_id: recipientId,
        resource_id: resourceId,
        message: data.message,
        image_urls: images,
        impact_description: data.impact_description,
      });
      
      logUserAction('thanks_create_success', {
        resourceId,
        recipientId,
        resourceTitle
      });
      
      logger.info('✅ ThanksForm: Thanks created successfully');
      
      // Reset form
      reset();
      setImages([]);
      
      // Call completion callback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      logger.error('❌ ThanksForm: Error creating thanks:', error);
      logUserAction('thanks_create_error', {
        resourceId,
        recipientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
                <AvatarFallback>{recipient.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-medium">{recipient.name}</div>
                {resourceTitle && (
                  <div className="text-xs text-warmgray-500">for "{resourceTitle}"</div>
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
              disabled={createThanksMutation.isPending}
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
              disabled={createThanksMutation.isPending}
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
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onComplete}
            disabled={createThanksMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createThanksMutation.isPending}
          >
            {createThanksMutation.isPending ? 'Sending...' : 'Send Thanks'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}