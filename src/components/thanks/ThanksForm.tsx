import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { eventBus } from '@/core/eventBus';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { mockMembers } from '@/api/mockData';

interface ThanksFormProps {
  resourceId: string;
  recipientId: string;
  onComplete?: () => void;
  resourceTitle?: string;
}

interface ThanksFormData {
  message: string;
  impact: string;
}

// Mock current user - would come from auth context
const currentUser = mockMembers[0];

export function ThanksForm({ resourceId, recipientId, onComplete, resourceTitle }: ThanksFormProps) {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<ThanksFormData>();
  const [images, setImages] = useState<string[]>([]);
  
  const recipient = mockMembers.find(m => m.id === recipientId);
  
  const onSubmit = (data: ThanksFormData) => {
    // Create the thanks data
    const thanksData = {
      from_member_id: currentUser.id,
      to_member_id: recipientId,
      resource_id: resourceId,
      message: data.message,
      impact_description: data.impact,
      image_urls: images,
      created_at: new Date().toISOString(),
    };
    
    // Emit event to be handled by the thanks manager
    eventBus.emit('thanks.created', thanksData);
    
    // Call the onComplete callback if provided
    if (onComplete) onComplete();
  };
  
  return (
    <Card className="animate-slide-up">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="text-lg">Send Thanks</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Avatar>
              <AvatarImage src={recipient?.avatar_url} />
              <AvatarFallback>{recipient?.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="font-medium">{recipient?.name}</div>
              {resourceTitle && (
                <div className="text-xs text-warmgray-500">for "{resourceTitle}"</div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Share your gratitude
            </label>
            <textarea
              {...register('message', { required: 'Please share your gratitude' })}
              className={`w-full border ${errors.message ? 'border-red-300' : 'border-gray-200'} rounded-md p-2 text-sm min-h-[100px]`}
              placeholder="Express how this helped you or made you feel..."
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
              {...register('impact')}
              className="w-full border border-gray-200 rounded-md p-2 text-sm"
              placeholder="Optional: Share how this made a difference for you..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-warmgray-700">
              Add photos (optional)
            </label>
            <ImageUpload onImagesUploaded={setImages} />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onComplete}>
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