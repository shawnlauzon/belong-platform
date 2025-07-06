import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import type { Database } from "../src/shared/types/database";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ROLE_KEY",
  );
  process.exit(1);
}

// Create Supabase client with service key for admin access
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function deleteTestUsers() {
  try {
    console.log("Fetching users with emails starting with 'test'...");
    
    // Get all auth users (using auth admin API)
    const { data: users, error: fetchError } = await supabase.auth.admin.listUsers();
    
    if (fetchError) {
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!users || users.users.length === 0) {
      console.log("No users found in the system.");
      return;
    }

    // Filter users whose email starts with "test"
    const testUsers = users.users.filter(user => 
      user.email?.toLowerCase().startsWith('test')
    );

    if (testUsers.length === 0) {
      console.log("No test users found (no users with emails starting with 'test').");
      return;
    }

    console.log(`Found ${testUsers.length} test users to delete:`);
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });

    // Confirm deletion
    console.log("\nDELETION WARNING: This will permanently delete these users and all their data.");
    console.log("Related data in profiles, resources, communities, etc. will also be deleted due to CASCADE constraints.");
    
    // In a real script, you might want to add a confirmation prompt
    // For now, we'll proceed with the deletion
    
    let deletedCount = 0;
    let failedCount = 0;

    for (const user of testUsers) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Failed to delete user ${user.email}: ${deleteError.message}`);
          failedCount++;
        } else {
          console.log(`✓ Successfully deleted user: ${user.email}`);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error deleting user ${user.email}:`, error);
        failedCount++;
      }
    }

    console.log(`\nDeletion complete:`);
    console.log(`  - Successfully deleted: ${deletedCount} users`);
    console.log(`  - Failed to delete: ${failedCount} users`);
    
    if (failedCount > 0) {
      console.log("Some deletions failed. Check the error messages above.");
      process.exit(1);
    }

  } catch (error) {
    console.error("Error during test user deletion:", error);
    process.exit(1);
  }
}

// Run the deletion script
deleteTestUsers();