import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import type { ResourceData, Resource } from '@belongnetwork/types';
import { toDomainResource, forDbInsert } from './resourceTransformer';
import { MESSAGE_AUTHENTICATION_REQUIRED } from 'src/constants';

export async function createResource(data: ResourceData): Promise<Resource> {
  logger.debug('📚 API: Creating resource', {
    data: { ...data, location: 'REDACTED' },
  });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('📚 API: User must be authenticated to create a resource', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const userId = userData.user.id;

    // Transform to database format
    const dbResource = forDbInsert(data, userId);

    // Insert into database
    const { data: createdResource, error } = await supabase
      .from('resources')
      .insert([dbResource])
      .select('*, owner:profiles(*), community:communities(*)')
      .single();

    if (error) {
      logger.error('📚 API: Failed to create resource', { error });
      throw error;
    }

    // Transform to domain model
    const resource = toDomainResource(createdResource);

    logger.info('📚 API: Successfully created resource', {
      id: resource.id,
      title: resource.title,
    });

    return resource;
  } catch (error) {
    logger.error('📚 API: Error creating resource', { error });
    throw error;
  }
}
