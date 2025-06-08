import { supabase } from '@belongnetwork/core';
import { mockResources } from './mockData';
import { logger, logApiCall, logApiResponse } from '@belongnetwork/core';

export async function seedResources() {
  logger.info('🌱 Starting resource seeding process...');

  try {
    logApiCall('GET', '/resources/count');

    // First check if resources already exist
    const { count } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true });

    logApiResponse('GET', '/resources/count', { count });

    if (count && count > 0) {
      logger.info('🌱 Resources already seeded, skipping...', {
        existingCount: count,
      });
      return;
    }

    // Get the current user's ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.error('❌ Must be authenticated to seed resources');
      return;
    }

    logger.info('🌱 Seeding resources for user:', {
      userId: user.id,
      resourceCount: mockResources.length,
    });
    logApiCall('POST', '/resources/seed', {
      userId: user.id,
      count: mockResources.length,
    });

    // Insert mock resources - set the current user as the creator_id
    const { error } = await supabase.from('resources').insert(
      mockResources.map((resource) => ({
        ...resource,
        creator_id: user.id, // Use the current user's ID
        location: `POINT(${resource.location.lng} ${resource.location.lat})`, // Convert to PostGIS point
        created_at: new Date(resource.created_at).toISOString(),
      }))
    );

    if (error) {
      logApiResponse('POST', '/resources/seed', null, error);
      throw error;
    }

    logApiResponse('POST', '/resources/seed', {
      success: true,
      count: mockResources.length,
    });
    logger.info('✅ Successfully seeded resources', {
      count: mockResources.length,
    });
  } catch (error) {
    logger.error('❌ Error seeding resources:', error);
  }
}
