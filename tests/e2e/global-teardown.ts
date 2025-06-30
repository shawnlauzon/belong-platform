import { FullConfig } from '@playwright/test';
import { join } from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up global test user...');
  
  try {
    // Read the test user data
    const fs = await import('fs');
    const testUserPath = join(process.cwd(), 'test-user.json');
    
    if (fs.existsSync(testUserPath)) {
      const testUserData = JSON.parse(fs.readFileSync(testUserPath, 'utf8'));
      console.log(`🗑️ Test user data found: ${testUserData.email}`);
      
      // Note: Supabase doesn't provide an easy way to delete users via API
      // In a real scenario, you might need to:
      // 1. Use Supabase Admin API to delete the user
      // 2. Or mark the user as test data in the database
      // 3. Or use a test database that gets reset
      
      // For now, just clean up the local file
      fs.unlinkSync(testUserPath);
      console.log('✅ Test user data file cleaned up');
    } else {
      console.log('ℹ️ No test user data file found');
    }
    
  } catch (error) {
    console.error('❌ Error during teardown:', error);
    // Don't throw - teardown errors shouldn't fail the test run
  }
}

export default globalTeardown;