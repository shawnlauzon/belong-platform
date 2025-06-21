import { logger } from '@belongnetwork/core';
import type { User, UserData, UserFilter } from '@belongnetwork/types';
import { toDomainUser, forDbInsert, forDbUpdate } from '../transformers/userTransformer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@belongnetwork/types/database';

export const createUserService = (supabase: SupabaseClient<Database>) => ({
  async fetchUsers(options?: UserFilter): Promise<User[]> {
    logger.debug('👤 API: Fetching users', { options });

    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search filter if provided
      if (options?.searchTerm) {
        const searchPattern = `%${options.searchTerm}%`;
        query = query.or(
          `email.ilike.${searchPattern},first_name.ilike.${searchPattern},last_name.ilike.${searchPattern}`
        );
      }

      // Apply pagination
      if (options?.page && options?.pageSize) {
        const from = (options.page - 1) * options.pageSize;
        const to = from + options.pageSize - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('👤 API: Failed to fetch users', { error });
        throw error;
      }

      const users = (data || []).map(toDomainUser);
      logger.debug('👤 API: Successfully fetched users', { count: users.length });
      return users;
    } catch (error) {
      logger.error('👤 API: Error fetching users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async fetchUserById(id: string): Promise<User | null> {
    logger.debug('👤 API: Fetching user by ID', { id });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          logger.debug('👤 API: User not found', { id });
          return null;
        }
        logger.error('👤 API: Failed to fetch user', { id, error });
        throw error;
      }

      const user = toDomainUser(data);
      logger.debug('👤 API: Successfully fetched user', {
        id,
        email: user.email,
      });
      return user;
    } catch (error) {
      logger.error('👤 API: Error fetching user', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  async createUser(accountId: string, userData: UserData): Promise<User> {
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
  },

  async updateUser(userData: Partial<User> & { id: string }): Promise<User> {
    logger.debug('👤 API: Updating user', { id: userData.id });

    try {
      const updateData = forDbUpdate(userData);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userData.id)
        .select()
        .single();

      if (error) {
        logger.error('👤 API: Failed to update user', { 
          id: userData.id, 
          error 
        });
        throw error;
      }

      const user = toDomainUser(data);
      
      logger.info('👤 API: Successfully updated user', { 
        id: user.id,
        email: user.email 
      });
      
      return user;
    } catch (error) {
      logger.error('👤 API: Error updating user', { 
        id: userData.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    logger.debug('👤 API: Deleting user', { id });

    try {
      // Check if user exists before deletion
      const { data: userData, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') { // Not found
          logger.debug('👤 API: User not found for deletion', { id });
          return;
        }
        throw fetchError;
      }

      // Perform the soft delete (set deleted_at)
      const { error: deleteError } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);

      if (deleteError) {
        logger.error('👤 API: Failed to delete user', { id, error: deleteError });
        throw deleteError;
      }
      
      logger.info('👤 API: Successfully deleted user', { id });
      
      return;
    } catch (error) {
      logger.error('👤 API: Error deleting user', { 
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },
});