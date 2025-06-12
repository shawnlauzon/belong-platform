import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { 
  Resource, 
  CreateResourceData, 
  UpdateResourceData,
  ResourceFilter 
} from '@belongnetwork/types';

// Data functions (pure async functions)
export async function fetchResources(filters?: ResourceFilter): Promise<Resource[]> {
  logger.debug('📦 API: Fetching resources', { filters });

  try {
    let query = supabase
      .from('resources')
      .select(`
        *,
        owner:profiles!resources_creator_id_fkey(
          id,
          email,
          user_metadata
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }
    if (filters?.searchTerm) {
      query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('📦 API: Failed to fetch resources', { error });
      throw error;
    }

    // Transform database records to domain objects
    const resources: Resource[] = (data || []).map(transformDbResourceToDomain);
    
    logger.debug('📦 API: Successfully fetched resources', { count: resources.length });
    return resources;
  } catch (error) {
    logger.error('📦 API: Error fetching resources', { error });
    throw error;
  }
}

export async function fetchResourceById(id: string): Promise<Resource | null> {
  logger.debug('📦 API: Fetching resource by ID', { id });

  try {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        owner:profiles!resources_creator_id_fkey(
          id,
          email,
          user_metadata
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Resource not found
      }
      throw error;
    }

    const resource = transformDbResourceToDomain(data);
    logger.debug('📦 API: Successfully fetched resource', { id, title: resource.title });
    return resource;
  } catch (error) {
    logger.error('📦 API: Error fetching resource by ID', { id, error });
    throw error;
  }
}

export async function createResource(data: CreateResourceData): Promise<Resource> {
  logger.debug('📦 API: Creating resource', { title: data.title });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create resources');
    }

    const resourceData = {
      ...data,
      creator_id: user.id,
      location: data.location ? `POINT(${data.location.lng} ${data.location.lat})` : null,
      is_active: true
    };

    const { data: newResource, error } = await supabase
      .from('resources')
      .insert(resourceData)
      .select(`
        *,
        owner:profiles!resources_creator_id_fkey(
          id,
          email,
          user_metadata
        )
      `)
      .single();

    if (error) {
      logger.error('📦 API: Failed to create resource', { error });
      throw error;
    }

    const resource = transformDbResourceToDomain(newResource);
    logger.info('📦 API: Successfully created resource', { id: resource.id, title: resource.title });
    return resource;
  } catch (error) {
    logger.error('📦 API: Error creating resource', { error });
    throw error;
  }
}

export async function updateResource(data: UpdateResourceData): Promise<Resource> {
  logger.debug('📦 API: Updating resource', { id: data.id });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update resources');
    }

    const updateData = {
      ...data,
      location: data.location ? `POINT(${data.location.lng} ${data.location.lat})` : undefined,
      updated_at: new Date().toISOString()
    };

    const { data: updatedResource, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', data.id)
      .eq('creator_id', user.id) // Ensure user owns the resource
      .select(`
        *,
        owner:profiles!resources_creator_id_fkey(
          id,
          email,
          user_metadata
        )
      `)
      .single();

    if (error) {
      logger.error('📦 API: Failed to update resource', { error });
      throw error;
    }

    const resource = transformDbResourceToDomain(updatedResource);
    logger.info('📦 API: Successfully updated resource', { id: resource.id, title: resource.title });
    return resource;
  } catch (error) {
    logger.error('📦 API: Error updating resource', { error });
    throw error;
  }
}

export async function deleteResource(id: string): Promise<void> {
  logger.debug('📦 API: Deleting resource', { id });

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to delete resources');
    }

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
      .eq('creator_id', user.id); // Ensure user owns the resource

    if (error) {
      logger.error('📦 API: Failed to delete resource', { error });
      throw error;
    }

    logger.info('📦 API: Successfully deleted resource', { id });
  } catch (error) {
    logger.error('📦 API: Error deleting resource', { error });
    throw error;
  }
}

// Helper function to transform database records to domain objects
function transformDbResourceToDomain(dbResource: any): Resource {
  const owner = dbResource.owner ? {
    id: dbResource.owner.id,
    email: dbResource.owner.email,
    first_name: dbResource.owner.user_metadata?.first_name || '',
    last_name: dbResource.owner.user_metadata?.last_name || '',
    full_name: dbResource.owner.user_metadata?.full_name || '',
    avatar_url: dbResource.owner.user_metadata?.avatar_url,
    created_at: new Date(dbResource.owner.created_at || Date.now()),
    updated_at: new Date(dbResource.owner.updated_at || Date.now())
  } : null;

  // Parse PostGIS point
  let location = undefined;
  if (dbResource.location) {
    const match = dbResource.location.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      location = {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
    }
  }

  return {
    id: dbResource.id,
    type: dbResource.type,
    category: dbResource.category,
    title: dbResource.title,
    description: dbResource.description,
    image_urls: dbResource.image_urls || [],
    location,
    pickup_instructions: dbResource.pickup_instructions,
    parking_info: dbResource.parking_info,
    meetup_flexibility: dbResource.meetup_flexibility,
    availability: dbResource.availability,
    is_active: dbResource.is_active,
    created_at: new Date(dbResource.created_at),
    updated_at: new Date(dbResource.updated_at),
    owner: owner!,
    community: { id: 'default', name: 'Default Community' } as any, // TODO: Add community support
    distance_minutes: undefined
  };
}

// React Query hooks
export function useResources(filters?: ResourceFilter) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => fetchResources(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: () => fetchResourceById(id),
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createResource,
    onSuccess: (newResource) => {
      // Invalidate and refetch resources list
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      
      // Add the new resource to the cache
      queryClient.setQueryData(['resources', newResource.id], newResource);
      
      logger.info('📦 API: Resource created successfully', { id: newResource.id });
    },
    onError: (error) => {
      logger.error('📦 API: Failed to create resource', { error });
    }
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateResource,
    onSuccess: (updatedResource) => {
      // Invalidate and refetch resources list
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      
      // Update the specific resource in cache
      queryClient.setQueryData(['resources', updatedResource.id], updatedResource);
      
      logger.info('📦 API: Resource updated successfully', { id: updatedResource.id });
    },
    onError: (error) => {
      logger.error('📦 API: Failed to update resource', { error });
    }
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteResource,
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch resources list
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      
      // Remove the resource from cache
      queryClient.removeQueries({ queryKey: ['resources', deletedId] });
      
      logger.info('📦 API: Resource deleted successfully', { id: deletedId });
    },
    onError: (error) => {
      logger.error('📦 API: Failed to delete resource', { error });
    }
  });
}