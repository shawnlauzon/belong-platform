import { logger } from '@/shared';
import type { Database } from '@/shared/types/database';
import { SupabaseClient } from '@supabase/supabase-js';
import { toCurrentUser, toCurrentUserUpdateRow } from '../transformers/userTransformer';
import { CurrentUser } from '../types';
import { commitImageUrls } from '@/features/images/api/imageCommit';
import { ProfileRow } from '../types/profileRow';
import { QueryError } from '@supabase/supabase-js';

export async function updateUser(
  supabase: SupabaseClient<Database>,
  userData: Partial<CurrentUser> & { id: string },
): Promise<CurrentUser> {
  logger.debug('👤 API: Updating user', { id: userData.id });

  // First, fetch the current profile to merge with partial updates
  const { data: currentProfile, error: fetchError } = (await supabase
    .from('profiles')
    .select()
    .eq('id', userData.id)
    .maybeSingle()) as {
    data: ProfileRow | null;
    error: QueryError | null;
  };

  if (fetchError) {
    throw fetchError;
  }

  if (!currentProfile) {
    throw new Error('Profile not found for update');
  }

  // Auto-commit avatar image if present and is temporary
  let finalAvatarUrl = userData.avatarUrl;
  if (userData.avatarUrl) {
    const permanentUrls = await commitImageUrls({
      supabase,
      imageUrls: [userData.avatarUrl],
      entityType: 'user',
      entityId: userData.id,
    });

    if (
      permanentUrls.length > 0 &&
      permanentUrls[0] !== userData.avatarUrl
    ) {
      finalAvatarUrl = permanentUrls[0];
    }
  }

  const updateData = toCurrentUserUpdateRow(
    { ...userData, avatarUrl: finalAvatarUrl },
    currentProfile,
  );

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userData.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const user = toCurrentUser(data);

  logger.info('👤 API: Successfully updated user', {
    id: user.id,
    email: user.email,
  });

  return user;
}
