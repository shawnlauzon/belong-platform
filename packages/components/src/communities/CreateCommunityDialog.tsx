import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventBus, useBelongStore } from '@belongnetwork/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/ui/dialog';
import { Button } from '~/ui/button';
import { AddressAutocomplete } from '~/shared/AddressAutocomplete';
import { LocationPicker } from '~/shared/LocationPicker';
import { CountryAutocomplete } from './CountryAutocomplete';
import { StateAutocomplete } from './StateAutocomplete';
import { Community, Coordinates } from '@belongnetwork/core';
import { logger, logComponentRender, logUserAction } from '@belongnetwork/core';

const communitySchema = z.object({
  country: z.string().min(2, 'Country is required'),
  state: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  neighborhood: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
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
  onCommunityCreated,
}: CreateCommunityDialogProps) {
  logComponentRender('CreateCommunityDialog', { open, parentCommunityId });

  const { list: communities = [] } = useBelongStore(
    (state) => state.communities
  );

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [addressBbox, setAddressBbox] = useState<
    [number, number, number, number] | null
  >(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentCommunity = parentCommunityId
    ? communities.find((c) => c.id === parentCommunityId)
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CommunityFormData>({
    resolver: zodResolver(communitySchema),
    defaultValues: {
      country: '',
      state: '',
      city: '',
      neighborhood: '',
      description: '',
      address: '',
    },
  });

  const watchedCity = watch('city');
  const watchedNeighborhood = watch('neighborhood');

  // Listen for community events
  useEffect(() => {
    const unsubscribeCreated = eventBus.on('community.created', (event) => {
      logger.info(
        '✅ CreateCommunityDialog: Community created successfully:',
        event.data
      );
      setIsSubmitting(false);
      setError(null);

      if (onCommunityCreated) {
        onCommunityCreated(event.data);
      }

      onOpenChange(false);
    });

    const unsubscribeFailed = eventBus.on(
      'community.create.failed',
      (event) => {
        logger.error(
          '❌ CreateCommunityDialog: Community creation failed:',
          event.data.error
        );
        setIsSubmitting(false);
        setError(event.data.error);
      }
    );

    return () => {
      unsubscribeCreated();
      unsubscribeFailed();
    };
  }, [onCommunityCreated, onOpenChange]);

  // Get the full hierarchy chain for the parent community
  const getParentHierarchy = () => {
    if (!parentCommunity) return { country: '', state: '', city: '' };

    const hierarchy = { country: '', state: '', city: '' };

    // Build the chain from parent to root
    const chain: Community[] = [];
    let currentId: string | null = parentCommunity.id;

    while (currentId) {
      const community = communities.find((c) => c.id === currentId);
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

      logger.debug(
        '🏘️ CreateCommunityDialog: Prefilling form based on parent:',
        {
          parentId: parentCommunity.id,
          parentName: parentCommunity.name,
          parentLevel: parentCommunity.level,
          hierarchy,
        }
      );

      // Set country and state
      if (hierarchy.country) {
        setSelectedCountry(hierarchy.country);
        setValue('country', hierarchy.country);
      }

      if (hierarchy.state) {
        setSelectedState(hierarchy.state);
        setValue('state', hierarchy.state);
      }

      // Set city if parent is a city
      if (hierarchy.city) {
        setValue('city', hierarchy.city);
      }

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
      setIsSubmitting(false);
      setError(null);
    }
  }, [open, reset]);

  const handleAddressChange = (
    address: string,
    coordinates: Coordinates | null,
    bbox?: [number, number, number, number]
  ) => {
    logger.debug('🏘️ CreateCommunityDialog: Address changed:', {
      address,
      coordinates,
      bbox,
    });

    setCurrentAddress(address);
    setValue('address', address);

    if (coordinates) {
      setLocation(coordinates);
      setAddressBbox(bbox || null);

      logUserAction('community_address_set', {
        address,
        coordinates,
        hasBbox: !!bbox,
      });
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
      country: data.country,
      state: data.state,
      city: data.city,
      neighborhood: data.neighborhood,
      hasParent: !!parentCommunityId,
      hasLocation: !!location,
      hasAddress: !!currentAddress,
    });

    setIsSubmitting(true);
    setError(null);

    // Determine what we're creating based on what's filled in
    let communityName: string;
    let communityLevel: Community['level'];
    let radius: number;

    if (data.neighborhood) {
      // Creating a neighborhood
      communityName = data.neighborhood;
      communityLevel = 'neighborhood';
      radius = 5;
    } else {
      // Creating a city
      communityName = data.city;
      communityLevel = 'city';
      radius = 25;
    }

    // Emit community creation request
    eventBus.emit('community.create.requested', {
      name: communityName,
      description: data.description,
      level: communityLevel,
      country: data.country,
      state: data.state,
      city: data.city,
      center: location || undefined,
      radius_km: radius,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Community</DialogTitle>
            <p className="text-sm text-warmgray-600">
              Create a new community by specifying the geographic hierarchy.
              Missing intermediate levels will be created automatically.
            </p>
            {parentCommunity && (
              <p className="text-sm text-primary-600 bg-primary-50 p-2 rounded">
                Creating under: <strong>{parentCommunity.name}</strong> (
                {parentCommunity.level})
              </p>
            )}
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Geographic Hierarchy */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">
                Geographic Location
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <CountryAutocomplete
                    value={selectedCountry}
                    onChange={handleCountryChange}
                    disabled={isSubmitting}
                  />
                  {errors.country && (
                    <p className="text-xs text-red-500">
                      {errors.country.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    State / Province (Optional)
                  </label>
                  <StateAutocomplete
                    value={selectedState}
                    onChange={handleStateChange}
                    country={selectedCountry}
                    disabled={isSubmitting || !selectedCountry}
                    placeholder="Enter state/province (optional)"
                  />
                  {errors.state && (
                    <p className="text-xs text-red-500">
                      {errors.state.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <input
                    {...register('city')}
                    className="w-full border rounded-md p-2"
                    placeholder="Enter city name"
                    disabled={isSubmitting}
                  />
                  {errors.city && (
                    <p className="text-xs text-red-500">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Neighborhood (Optional)
                  </label>
                  <input
                    {...register('neighborhood')}
                    className="w-full border rounded-md p-2"
                    placeholder="Enter neighborhood name"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-warmgray-500">
                    Leave empty to create a city-level community
                  </p>
                </div>
              </div>
            </div>

            {/* Community Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                {...register('description')}
                className="w-full border rounded-md p-2 min-h-[80px]"
                placeholder="Describe your community..."
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-xs text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Specific Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">
                Specific Location (Optional)
              </h3>

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
                  <label className="text-sm font-medium">
                    Fine-tune Location
                  </label>
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
            {(selectedCountry ||
              selectedState ||
              watchedCity ||
              watchedNeighborhood) && (
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-warmgray-700">
                  Community Hierarchy Preview
                </h4>
                <div className="text-sm text-warmgray-600">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-warmgray-400">🌍</span>
                    <span>Worldwide</span>
                    {selectedCountry && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{selectedCountry}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {communities.find((c) => c.name === selectedCountry)
                            ? 'exists'
                            : 'will create'}
                        </span>
                      </>
                    )}
                    {selectedState && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{selectedState}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {communities.find((c) => c.name === selectedState)
                            ? 'exists'
                            : 'will create'}
                        </span>
                      </>
                    )}
                    {watchedCity && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{watchedCity}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {communities.find((c) => c.name === watchedCity)
                            ? 'exists'
                            : 'will create'}
                        </span>
                      </>
                    )}
                    {watchedNeighborhood && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium text-primary-600">
                          {watchedNeighborhood}
                        </span>
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                          new
                        </span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-warmgray-500">
                    {watchedNeighborhood
                      ? `Creating neighborhood "${watchedNeighborhood}" in ${watchedCity}`
                      : watchedCity
                        ? `Creating city "${watchedCity}"`
                        : 'Fill in the fields above to see what will be created'}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Community'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
