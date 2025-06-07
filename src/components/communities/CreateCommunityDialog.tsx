import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { LocationPicker } from '@/components/shared/LocationPicker';
import { useCreateCommunity, useCommunities } from '@/hooks/useCommunities';
import { Community, Coordinates } from '@/types';
import { logger, logComponentRender, logUserAction } from '@/lib/logger';

const communitySchema = z.object({
  name: z.string().min(2, 'Community name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  level: z.enum(['neighborhood', 'city', 'state', 'country']),
  address: z.string().optional(),
});

type CommunityFormData = z.infer<typeof communitySchema>;

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCommunityId?: string;
  onCommunityCreated?: (community: Community) => void;
}

export function CreateCommunityDialog({ 
  open, 
  onOpenChange, 
  parentCommunityId,
  onCommunityCreated 
}: CreateCommunityDialogProps) {
  logComponentRender('CreateCommunityDialog', { open, parentCommunityId });
  
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [addressBbox, setAddressBbox] = useState<[number, number, number, number] | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  
  const { data: communities = [] } = useCommunities();
  const createCommunityMutation = useCreateCommunity();
  
  const parentCommunity = parentCommunityId 
    ? communities.find(c => c.id === parentCommunityId)
    : null;

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      name: '',
      description: '',
      level: 'neighborhood',
      address: '',
    }
  });

  const handleAddressChange = (address: string, coordinates: Coordinates | null, bbox?: [number, number, number, number]) => {
    logger.debug('🏘️ CreateCommunityDialog: Address changed:', { address, coordinates, bbox });
    
    setCurrentAddress(address);
    setValue('address', address);
    
    if (coordinates) {
      setLocation(coordinates);
      setAddressBbox(bbox || null);
      
      logUserAction('community_address_set', { address, coordinates, hasBbox: !!bbox });
    }
  };

  const onSubmit = async (data: CommunityFormData) => {
    logger.debug('🏘️ CreateCommunityDialog: Form submitted:', data);
    logUserAction('community_create_attempt', {
      name: data.name,
      level: data.level,
      hasParent: !!parentCommunityId,
      hasLocation: !!location,
      hasAddress: !!currentAddress
    });

    try {
      const newCommunity = await createCommunityMutation.mutateAsync({
        name: data.name,
        description: data.description,
        level: data.level,
        parent_id: parentCommunityId,
        center: location || undefined,
        radius_km: getDefaultRadius(data.level),
      });

      logger.info('✅ CreateCommunityDialog: Community created:', newCommunity);
      logUserAction('community_create_success', {
        communityId: newCommunity.id,
        name: newCommunity.name,
        level: newCommunity.level
      });

      // Call the callback if provided
      if (onCommunityCreated) {
        onCommunityCreated(newCommunity);
      }

      // Reset form and close dialog
      reset();
      setLocation(null);
      setAddressBbox(null);
      setCurrentAddress('');
      onOpenChange(false);

    } catch (error) {
      logger.error('❌ CreateCommunityDialog: Error creating community:', error);
      logUserAction('community_create_error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const getDefaultRadius = (level: string): number => {
    switch (level) {
      case 'neighborhood': return 5;
      case 'city': return 25;
      case 'state': return 200;
      case 'country': return 1000;
      default: return 25;
    }
  };

  const getLevelDescription = (level: string): string => {
    switch (level) {
      case 'neighborhood': return 'A local area within a city (5km radius)';
      case 'city': return 'A city or town (25km radius)';
      case 'state': return 'A state or province (200km radius)';
      case 'country': return 'A country (1000km radius)';
      default: return '';
    }
  };

  const isSubmitting = createCommunityMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Community</DialogTitle>
            {parentCommunity && (
              <p className="text-sm text-warmgray-600">
                Creating a new community under <span className="font-medium">{parentCommunity.name}</span>
              </p>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Community Name</label>
              <input
                {...register('name')}
                className="w-full border rounded-md p-2"
                placeholder="Enter community name"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Level</label>
              <select
                {...register('level')}
                className="w-full border rounded-md p-2"
                disabled={isSubmitting}
              >
                <option value="neighborhood">Neighborhood</option>
                <option value="city">City</option>
                <option value="state">State/Province</option>
                <option value="country">Country</option>
              </select>
              <p className="text-xs text-warmgray-500">
                {getLevelDescription(register('level').value || 'neighborhood')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register('description')}
                className="w-full border rounded-md p-2 min-h-[80px]"
                placeholder="Describe your community..."
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Location (Optional)</label>
              
              <div className="space-y-2">
                <AddressAutocomplete
                  value={currentAddress}
                  onChange={handleAddressChange}
                  placeholder="Enter the community's main address or area"
                  className="w-full"
                />
                <p className="text-xs text-warmgray-500">
                  This helps define the community's geographic center
                </p>
              </div>

              {(location || currentAddress) && (
                <div className="space-y-2">
                  <LocationPicker 
                    value={location}
                    onChange={setLocation}
                    address={currentAddress}
                    addressBbox={addressBbox}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Community'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}