import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/types";

export const createTestSupabaseClient = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  async cleanupTestData(namePattern: string): Promise<void> {
    try {
      // Clean up communities with test names
      await this.client
        .from("communities")
        .delete()
        .like("name", `%${namePattern}%`);

      // Clean up resources with test names
      await this.client
        .from("resources")
        .delete()
        .like("title", `%${namePattern}%`);

      // Clean up events with test names
      await this.client
        .from("events")
        .delete()
        .like("title", `%${namePattern}%`);

      // Clean up shoutouts records (by user IDs that have test emails)
      const { data: testUsers } = await this.client
        .from("profiles")
        .select("id")
        .like("email", "%test-%");

      if (testUsers && testUsers.length > 0) {
        const testUserIds = testUsers.map(user => user.id);
        
        await this.client
          .from("shoutouts")
          .delete()
          .in("giver_id", testUserIds);

        await this.client
          .from("shoutouts")
          .delete()
          .in("receiver_id", testUserIds);
      }

      // Clean up conversations and messages for test users
      if (testUsers && testUsers.length > 0) {
        const testUserIds = testUsers.map(user => user.id);
        
        await this.client
          .from("direct_messages")
          .delete()
          .in("sender_id", testUserIds);

        await this.client
          .from("conversations")
          .delete()
          .in("creator_id", testUserIds);
      }
    } catch (error) {
      console.warn("Database cleanup failed:", error);
      // Don't throw - cleanup failures shouldn't fail tests
    }
  }

  async cleanupTestUsers(): Promise<void> {
    try {
      // Note: In a real test environment, you might want to clean up
      // auth.users as well, but that requires service role access
      // For now, we'll just clean up profiles
      await this.client
        .from("profiles")
        .delete()
        .like("email", "%test-%");
    } catch (error) {
      console.warn("User cleanup failed:", error);
    }
  }

  async getTestUserCount(): Promise<number> {
    const { count } = await this.client
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .like("email", "%test-%");
    
    return count || 0;
  }
}

export const dbHelper = new DatabaseTestHelper();