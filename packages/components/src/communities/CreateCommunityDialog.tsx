import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// TODO: Re-enable when API is ready
// import { useCreateCommunity } from '@belongnetwork/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { AddressAutocomplete } from '../shared/AddressAutocomplete';
import { LocationPicker } from '../shared/LocationPicker';
import { CountryAutocomplete } from './CountryAutocomplete';
import { StateAutocomplete } from './StateAutocomplete';
import { Coordinates } from '@belongnetwork/core';

// TODO: Import from @belongnetwork/core when available
interface HierarchyLevel {
  level: string;
  name: string;
}

interface Community {
  id: string;
  name: string;
  description?: string;
  center?: Coordinates;
  memberCount?: number;
  hierarchyPath?: HierarchyLevel[];
  // Old interface fallback properties
  country?: string;
  state?: string;
  city?: string;
  level?: string;
}

const communitySchema = z.object({
  name: z.string().min(2, 'Community name is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  country: z.string().min(2, 'Country is required'),
  state: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
});

type CommunityFormData = z.infer<typeof communitySchema>;

interface CreateCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentCommunity?: Community;
  onCommunityCreated?: (community: Community) => void;
}

export function CreateCommunityDialog({
  open,
  onOpenChange,
  parentCommunity,
  onCommunityCreated,
}: CreateCommunityDialogProps) {
  // TODO: Replace with actual useCreateCommunity when API is ready
  interface CreateCommunityData {
    name: string;
    description: string;
    country: string;
    state: string;
    city: string;
  }
  
  const createCommunityMutation = {
    mutateAsync: async (data: CreateCommunityData) => {
      console.log('Mock community creation:', data);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      return { id: 'mock-id', ...data };
    },
    isPending: false,
    error: null as Error | null,
  };

  const [location, setLocation] = useState<Coordinates | null>(null);
  const [addressBbox, setAddressBbox] = useState<
    [number, number, number, number] | null
  >(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  const { isPending: isSubmitting, error } = createCommunityMutation;

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
      name: '',
      description: '',
      country: '',
      state: '',
      city: '',
      neighborhood: '',
      address: '',
    },
  });

  const watchedName = watch('name');
  const watchedCity = watch('city');
  const watchedNeighborhood = watch('neighborhood');


  // Prefill form when dialog opens or parent changes
  useEffect(() => {
    if (open && parentCommunity) {
      // Handle different Community interface structures
      // Check if hierarchyPath exists (new interface) or fall back to old interface
      if ('hierarchyPath' in parentCommunity && parentCommunity.hierarchyPath) {
        const hierarchy = parentCommunity.hierarchyPath;
        const countryInfo = hierarchy.find((h: HierarchyLevel) => h.level === 'country');
        const stateInfo = hierarchy.find((h: HierarchyLevel) => h.level === 'state');
        const cityInfo = hierarchy.find((h: HierarchyLevel) => h.level === 'city');

        if (countryInfo) {
          setSelectedCountry(countryInfo.name);
          setValue('country', countryInfo.name);
        }

        if (stateInfo) {
          setSelectedState(stateInfo.name);
          setValue('state', stateInfo.name);
        }

        if (cityInfo) {
          setValue('city', cityInfo.name);
        }
      } else {
        // Fall back to old interface structure
        const community = parentCommunity as Community & { state?: string; city?: string };
        if (community.country) {
          setSelectedCountry(community.country);
          setValue('country', community.country);
        }
        if (community.state) {
          setSelectedState(community.state);
          setValue('state', community.state);
        }
        if (community.city) {
          setValue('city', community.city);
        }
      }

      // If parent has a location, use it as a starting point
      if (parentCommunity.center) {
        setLocation(parentCommunity.center);
      }
    }
  }, [open, parentCommunity, setValue]);

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

  const handleAddressChange = (
    address: string,
    coordinates: Coordinates | null,
    bbox?: [number, number, number, number]
  ) => {
    setCurrentAddress(address);
    setValue('address', address);

    if (coordinates) {
      setLocation(coordinates);
      setAddressBbox(bbox || null);
    }
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setValue('country', country);

    // Reset state when country changes
    setSelectedState('');
    setValue('state', '');
  };

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setValue('state', state);
  };

  const onSubmit = async (data: CommunityFormData) => {
    console.log('Creating community with data:', data);
    
    try {
      // For now, create a mock community object
      const mockCommunity: CreateCommunityData = {
        name: data.name,
        description: data.description as string,
        country: data.country,
        state: data.state || '',
        city: data.city,
      };

      const newCommunity = await createCommunityMutation.mutateAsync(mockCommunity);

      if (onCommunityCreated) {
        onCommunityCreated(newCommunity as Community);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create community:', error);
    }
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
                Creating under: <strong>{parentCommunity.name}</strong>
              </p>
            )}
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Community Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-warmgray-800">
                Community Details
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">Community Name</label>
                <input
                  {...register('name')}
                  className="w-full border rounded-md p-2"
                  placeholder="Enter community name"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

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
            {(watchedName ||
              selectedCountry ||
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
                      </>
                    )}
                    {selectedState && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{selectedState}</span>
                      </>
                    )}
                    {watchedCity && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium">{watchedCity}</span>
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
                    {watchedName && !watchedNeighborhood && (
                      <>
                        <span className="text-warmgray-400">›</span>
                        <span className="font-medium text-primary-600">
                          {watchedName}
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
                      : watchedName
                        ? `Creating community "${watchedName}"`
                        : 'Fill in the fields above to see what will be created'}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  {(error as Error)?.message || 'An error occurred while creating the community'}
                </p>
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
