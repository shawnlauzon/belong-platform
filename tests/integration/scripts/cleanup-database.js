#!/usr/bin/env node

/**
 * Manual Database Cleanup Script
 * 
 * This script can be run manually to completely clean the test database
 * Usage: node tests/integration/scripts/cleanup-database.js
 */

import { execSync } from 'child_process';

async function cleanupDatabase() {
  console.log('🧹 Starting manual database cleanup...');
  
  try {
    // Use the database helper to clean up
    const { dbHelper } = await import('../setup/database-setup.js');
    
    // Perform complete cleanup
    await dbHelper.cleanupAllTestData();
    
    // Get final counts
    const counts = await dbHelper.getTestDataCounts();
    
    console.log('📊 Final database counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });
    
    console.log('✅ Database cleanup completed successfully');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDatabase();
}

export { cleanupDatabase };