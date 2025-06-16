import { supabase } from '@belongnetwork/core';
import { logger } from '@belongnetwork/core';
import { toDomainUser, forDbInsert } from './userTransformer';
import type { User, UserData } from '@belongnetwork/types';

export async function createUser(accountId: string, userData: UserData): Promise<User> {
  logger.debug('👤 API: Creating user', { email: userData.email, accountId });

  try {
    const dbData = forDbInsert({ ...userData, id: accountId });
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      logger.error('👤 API: Failed to create user', { 
        email: userData.email,
        accountId,
        error 
      });
      throw error;
    }

    const user = toDomainUser(data);
    
    logger.info('👤 API: Successfully created user', { 
      id: user.id, 
      email: user.email 
    });
    
    return user;
  } catch (error) {
    logger.error('👤 API: Error creating user', { 
      email: userData.email,
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
