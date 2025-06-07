import React, { useState, useEffect } from 'react';
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
import { CountryAutocomplete } from './CountryAutocomplete';
import { StateAutocomplete } from './StateAutocomplete';
import { useCreateCommunity, useCommunities } from '@/hooks/useCommunities';
import { Community, Coordinates } from '@/types';
import { logger, logComponentRender, logUserAction } from '@/lib/logger';

const communitySchema = z.object({
  name: z.string().min(2, 'Community name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  level: z.enum(['neighborhood', 'city']),
  country: z.string().min(2, 'Country is required'),
  state: z.string().min(2, 'State/Province is required'),
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
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  
  const { data: communities = [] } = useCommunities();
  const createCommunityMutation = useCreateCommunity();
  
  const parentCommunity = parentCommunityId 
    ? communities.find(c => c.id === parentCommunityId)
    : null;

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      name: '',
      description: '',
      level: 'neighborhood',
      country: '',
      state: '',
      address: '',
    }
  });

  const watchedLevel = watch('level');
  const watchedName = watch('name');

  // Get the full hierarchy chain for the parent community
  const getParentHierarchy = () => {
    if (!parentCommunity) return { country: '', state: '', city: '' };

    const hierarchy = { country: '', state: '', city: '' };
    
    // Build the chain from parent to root
    const chain: Community[] = [];
    let currentId = parentCommunity.id;
    
    while (currentId) {
      const community = communities.find(c => c.id === currentId);
      if (community) {
        chain.unshift(community);
        currentId = community.parent_id;
      } else {
        break;
      }
    }

    // Extract country, state, and city from the chain
    for (const community of chain) {
      if (community.level === 'country') {
        hierarchy.country = community.name;
      } else if (community.level === 'state') {
        hierarchy.state = community.name;
      } else if (community.level === 'city') {
        hierarchy.city = community.name;
      }
    }

    // If the parent itself is a city, include it
    if (parentCommunity.level === 'city') {
      hierarchy.city = parentCommunity.name;
    }

    return hierarchy;
  };

  // Prefill form when dialog opens or parent changes
  useEffect(() => {
    if (open && parentCommunity) {
      const hierarchy = getParentHierarchy();
      
      logger.debug('🏘️ CreateCommunityDialog: Prefilling form based on parent:', {
        parentId: parentCommunity.id,
        parentName: parentCommunity.name,
        parentLevel: parentCommunity.level,
        hierarchy
      });

      // Set country and state
      if (hierarchy.country) {
        setSelectedCountry(hierarchy.country);
        setValue('country', hierarchy.country);
      }
      
      if (hierarchy.state) {
        setSelectedState(hierarchy.state);
        setValue('state', hierarchy.state);
      }

      // Set default level based on parent
      let defaultLevel: 'neighborhood' | 'city' = 'neighborhood';
      if (parentCommunity.level === 'state') {
        defaultLevel = 'city';
      } else if (parentCommunity.level === 'city') {
        defaultLevel = 'neighborhood';
      }
      
      setValue('level', defaultLevel);

      // If parent has a location, use it as a starting point
      if (parentCommunity.center) {
        setLocation(parentCommunity.center);
      }

      logUserAction('community_dialog_prefilled', {
        parentId: parentCommunity.id,
        parentLevel: parentCommunity.level,
        country: hierarchy.country,
        state: hierarchy.state,
        city: hierarchy.city,
        defaultLevel
      });
    }
  }, [open, parentCommunity, communities, setValue]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      reset();
      setLocation(null);
      setAddressBbox(null);
      setCurrentAddress('');
      setSelectedCountry('');
      setSelectedState('');
    }
  }, [open, reset]);

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

  const handleCountryChange = (country: string) => {
    logger.debug('🏘️ CreateCommunityDialog: Country changed:', { country });
    setSelectedCountry(country);
    setValue('country', country);
    
    // Reset state when country changes
    setSelectedState('');
    setValue('state', '');
    
    logUserAction('community_country_set', { country });
  };

  const handleStateChange = (state: string) => {
    logger.debug('🏘️ CreateCommunityDialog: State changed:', { state });
    setSelectedState(state);
    setValue('state', state);
    
    logUserAction('community_state_set', { state, country: selectedCountry });
  };

  const onSubmit = async (data: CommunityFormData) => {
    logger.debug('🏘️ CreateCommunityDialog: Form submitted:', data);
    logUserAction('community_create_attempt', {
      name: data.name,
      level: data.level,
      country: data.country,
      state: data.state,
      hasParent: !!parentCommunityId,
      hasLocation: !!location,
      hasAddress: !!currentAddress
    });

    try {
      // Create the community with full hierarchy
      const newCommunity = await createCommunityMutation.mutateAsync({
        name: data.name,
        description: data.description,
        level: data.level,
        country: data.country,
        state: data.state,
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

      // Close dialog (form will be reset by useEffect)
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
      default: return 25;
    }
  };

  const getLevelDescription = (level: string): string => {
    switch (level) {
      case 'neighborhood': return 'A local area within a city (5km radius)';
      case 'city': return 'A city or town (25km radius)';
      default: return '';
    }
  };

  const isSubmitting = createCommunityMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Community</DialogTitle>
            <p className="text-sm text-warmgray-600">
              Create a new community with all necessary geographic levels. Missing intermediate levels will be created automatically.
            </p>
            {parentCommunity && (
              <p className="text-sm text-primary-600 bg-primary-50 p-2 rounded">
                Creating under: <strong>{parentCommunity.name}</strong> ({parentCommunity.level})
              </p>
            )}
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Community Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">Community Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
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
                  </select>
                  <p className="text-xs text-warmgray-500">
                    {getLevelDescription(watchedLevel)}
                  </p>
                </div>
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
            </div>

            {/* Geographic Hierarchy */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">Geographic Location</h3>
              <p className="text-sm text-warmgray-600">
                Specify the geographic hierarchy. If any level doesn't exist, it will be created automatically.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <CountryAutocomplete
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    disabled={isSubmitting}
                  />
                  {errors.country && (
                    <p className="text-xs text-red-500">{errors.country.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">State / Province</label>
                  <StateAutocomplete
                    value={selectedState}
                    onChange={handleStateChange}
                    country={selectedCountry}
                    disabled={isSubmitting || !selectedCountry}
                  />
                  {errors.state && (
                    <p className="text-xs text-red-500">{errors.state.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Specific Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">Specific Location (Optional)</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
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
                  <label className="text-sm font-medium">Fine-tune Location</label>
                  <LocationPicker 
                    value={location}
                    onChange={setLocation}
                    address={currentAddress}
                    addressBbox={addressBbox}
                  />
                </div>
              )}
            </div>

            {/* Preview */}
            {(selectedCountry || selectedState || watchedName) && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-warmgray-700">Community Hierarchy Preview</h4>
                <div className="text-sm text-warmgray-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-warmgray-400">🌍</span>
                    <span>Worldwide</span>
                    {selectedCountry && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{selectedCountry}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {communities.find(c => c.name === selectedCountry) ? 'exists' : 'will create'}
                        </span>
                      </>
                    )}
                    {selectedState && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{selectedState}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {communities.find(c => c.name === selectedState) ? 'exists' : 'will create'}
                        </span>
                      </>
                    )}
                    {watchedName && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium text-primary-600">{watchedName}</span>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">new</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
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