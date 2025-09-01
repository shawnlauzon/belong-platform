import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toCurrentUser, toCurrentUserInsertRow } from '../transformers/userTransformer';
import { CurrentUser } from '../types';
import { getAuthIdOrThrow } from '@/shared/utils/auth-helpers';
import { joinCommunity } from '@/features/communities/api/joinCommunity';
import { createConnectionRequest } from '@/features/connections/api/createConnectionRequest';

/**
 * Process invitation code from auth metadata
 * Auto-joins user to community and creates connection request
 */
async function processInvitationCode(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  try {
    // Get auth user to access metadata
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      logger.debug('👤 API: No auth user found for invitation processing');
      return;
    }

    const invitationCode = authData.user.user_metadata?.invitation_code;
    
    if (!invitationCode) {
      logger.debug('👤 API: No invitation code found in auth metadata');
      return;
    }

    logger.info('👤 API: Processing invitation code', { userId, invitationCode });

    // Find the connection code to get community info
    const { data: memberCode, error: codeError } = await supabase
      .from('community_member_codes')
      .select(`
        *,
        communities!inner(
          id,
          name
        )
      `)
      .eq('code', invitationCode)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) {
      logger.error('👤 API: Error finding invitation code', { error: codeError, invitationCode });
      return;
    }

    if (!memberCode) {
      logger.warn('👤 API: Invalid or inactive invitation code', { invitationCode });
      return;
    }

    // Auto-join the community
    await joinCommunity(supabase, memberCode.community_id);
    logger.info('👤 API: User automatically joined community', { 
      userId, 
      communityId: memberCode.community_id,
      communityName: memberCode.communities?.name,
    });

    // Create connection request with the invitation originator
    const connectionResult = await createConnectionRequest(supabase, invitationCode);
    logger.info('👤 API: Connection request processed', { 
      userId, 
      success: connectionResult.success,
      message: connectionResult.message,
    });

  } catch (error) {
    // Log error but don't fail user creation
    logger.error('👤 API: Error processing invitation code', { 
      error,
      userId,
    });
  }
}

export async function createUser(
  supabase: SupabaseClient<Database>,
  userData: Omit<CurrentUser, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CurrentUser> {
  logger.debug('👤 API: Creating user', { email: userData.email });

  try {
    const userId = await getAuthIdOrThrow(supabase);
    const dbData = toCurrentUserInsertRow({ ...userData, id: userId });

    const { data, error } = await supabase
      .from('profiles')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('👤 API: Failed to create user', {
        email: userData.email,
        error,
      });
      throw error;
    }

    const user = toCurrentUser(data);

    logger.info('👤 API: Successfully created user', {
      id: user.id,
      email: user.email,
    });

    // Process invitation code if present in auth metadata
    await processInvitationCode(supabase, user.id);

    return user;
  } catch (error) {
    logger.error('👤 API: Error creating user', {
      email: userData.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
