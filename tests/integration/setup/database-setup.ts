import { createClient, User } from '@supabase/supabase-js';
import { Database } from '../../../src/shared';

export const createTestSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseRoKey = process.env.VITE_SUPABASE_ROLE_KEY!;

  return createClient<Database>(supabaseUrl, supabaseRoKey, {
    auth: {
      persistSession: false, // Don't persist sessions in tests
      autoRefreshToken: false, // Don't auto-refresh tokens in tests
    },
  });
};

export const testConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
};

export class DatabaseTestHelper {
  private client = createTestSupabaseClient();

  async cleanupTestData(namePattern: string = 'test'): Promise<void> {
    try {
      console.log(
        `🧹 Starting cleanup of test data with pattern: ${namePattern}`
      );

      // Get test user IDs first
      const { data: testUsers } = await this.client
        .from('profiles')
        .select('id')
        .like('email', '%test%');

      const testUserIds = testUsers?.map((user) => user.id) || [];

      // Clean up in proper order to handle foreign key constraints
      const cleanupOperations = [
        // Delete shoutouts first (references users)
        async () => {
          if (testUserIds.length > 0) {
            await this.client
              .from('shoutouts')
              .delete()
              .in('from_user_id', testUserIds);
            await this.client
              .from('shoutouts')
              .delete()
              .in('to_user_id', testUserIds);
          }
        },

        // Delete event attendances (references events and users)
        async () => {
          if (testUserIds.length > 0) {
            await this.client
              .from('event_attendances')
              .delete()
              .in('user_id', testUserIds);
          }
        },

        // Delete events (references communities)
        async () => {
          await this.client
            .from('events')
            .delete()
            .like('title', `%${namePattern}%`);
        },

        // Delete direct messages and conversations
        async () => {
          if (testUserIds.length > 0) {
            await this.client
              .from('direct_messages')
              .delete()
              .in('from_user_id', testUserIds);
            await this.client
              .from('direct_messages')
              .delete()
              .in('to_user_id', testUserIds);
            await this.client
              .from('conversations')
              .delete()
              .in('participant_1_id', testUserIds);
            await this.client
              .from('conversations')
              .delete()
              .in('participant_2_id', testUserIds);
          }
        },

        // Delete notifications
        async () => {
          if (testUserIds.length > 0) {
            await this.client
              .from('notifications')
              .delete()
              .in('user_id', testUserIds);
          }
        },

        // Delete resources
        async () => {
          await this.client
            .from('resources')
            .delete()
            .like('title', `%${namePattern}%`);
          if (testUserIds.length > 0) {
            await this.client
              .from('resources')
              .delete()
              .in('owner_id', testUserIds);
          }
        },

        // Delete community memberships
        async () => {
          if (testUserIds.length > 0) {
            await this.client
              .from('community_memberships')
              .delete()
              .in('user_id', testUserIds);
          }
        },

        // Delete communities
        async () => {
          await this.client
            .from('communities')
            .delete()
            .like('name', `%${namePattern}%`);
          if (testUserIds.length > 0) {
            await this.client
              .from('communities')
              .delete()
              .in('organizer_id', testUserIds);
          }
        },

        // Finally delete profiles
        async () => {
          await this.client.from('profiles').delete().like('email', '%test%');
        },
      ];

      for (const operation of cleanupOperations) {
        try {
          await operation();
        } catch (error) {
          // Continue with other cleanups even if one fails
          console.warn(`Cleanup operation failed:`, error);
        }
      }

      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.warn('Database cleanup failed:', error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  async cleanupAllTestData(): Promise<void> {
    try {
      console.log('🧹 Starting complete test data cleanup');

      // Clean up all data in proper order to handle foreign key constraints
      const completeCleanupOperations = [
        // Delete all dependent records first
        async () => {
          await this.client.from('shoutouts').delete().like('name', '%test%');
        },
        async () => {
          await this.client.from('events').delete().like('name', '%test%');
        },
        async () => {
          await this.client.from('resources').delete().like('name', '%test%');
        },
        async () => {
          await this.client
            .from('community_memberships')
            .delete()
            .like('user_id', '%test%');
        },
        async () => {
          await this.client.from('communities').delete().like('name', '%test%');
        },
        async () => {
          // First get all auth users
          const { data: users } = await this.client.auth.admin.listUsers();

          if (users.users && users.users.length > 0) {
            // Delete from auth.users
            for (const user of users.users) {
              if (
                user.email?.includes('test') ||
                user.email?.includes('TEST')
              ) {
                try {
                  await this.client.auth.admin.deleteUser(user.id);
                } catch (error) {
                  console.warn(`Failed to delete auth user ${user.id}:`, error);
                }
              }
            }
          }

          // Then delete profiles (may already be cascaded)
          await this.client
            .from('profiles')
            .delete()
            .like('email', '%test%')
            .select();
        },
      ];

      for (const operation of completeCleanupOperations) {
        try {
          await operation();
        } catch (error) {
          console.warn(`Complete cleanup operation failed:`, error);
        }
      }

      console.log('✅ Complete test data cleanup finished');
    } catch (error) {
      console.warn('Complete cleanup failed:', error);
      // Fallback to individual table cleanup
      await this.cleanupTestData();
    }
  }

  async cleanupTestUsers(): Promise<void> {
    try {
      console.log('🧹 Cleaning up test users');

      // First get all test users from profiles
      const { data: testProfiles } = await this.client
        .from('profiles')
        .select('id')
        .like('email', '%test%');

      if (testProfiles && testProfiles.length > 0) {
        // Delete from auth.users using the Admin API
        for (const profile of testProfiles) {
          try {
            // Use the auth admin API to delete users
            const { error } = await this.client.auth.admin.deleteUser(
              profile.id
            );
            if (error) {
              console.warn(`Failed to delete auth user ${profile.id}:`, error);
            }
          } catch (error) {
            console.warn(`Error deleting auth user ${profile.id}:`, error);
          }
        }
      }

      // Then clean up profiles table (this should cascade from auth.users deletion,
      // but we'll do it explicitly to be sure)
      await this.client
        .from('profiles')
        .delete()
        .like('email', '%test%')
        .select();

      console.log('✅ Test users cleanup completed (auth users and profiles)');
    } catch (error) {
      console.warn('User cleanup failed:', error);
    }
  }

  async getTestUserCount(): Promise<number> {
    try {
      const { count } = await this.client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .like('email', '%test%');

      return count || 0;
    } catch (error) {
      console.warn('Failed to get test user count:', error);
      return 0;
    }
  }

  async getTestDataCounts(): Promise<Record<string, number>> {
    try {
      const tables = [
        'profiles',
        'communities',
        'community_memberships',
        'resources',
        'events',
        'event_attendances',
        'shoutouts',
        'conversations',
        'direct_messages',
        'notifications',
      ];

      const counts: Record<string, number> = {};

      for (const table of tables) {
        try {
          const { count } = await this.client
            .from(table as any)
            .select('*', { count: 'exact', head: true });
          counts[table] = count || 0;
        } catch (error) {
          counts[table] = -1; // Indicate error
        }
      }

      return counts;
    } catch (error) {
      console.warn('Failed to get test data counts:', error);
      return {};
    }
  }
}

export const dbHelper = new DatabaseTestHelper();
