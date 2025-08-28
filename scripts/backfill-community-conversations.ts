#!/usr/bin/env tsx

/**
 * Backfill script to create community conversations for all existing communities
 * 
 * This script should be run after the community chat migration to ensure
 * all existing communities have their chat conversations created with proper
 * participant memberships.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/shared/types/database';

// Use environment variables or default to local development
const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

interface Community {
  id: string;
  name: string;
  created_at: string;
}

interface CommunityMembership {
  user_id: string;
  community_id: string;
  created_at: string;
}

async function backfillCommunityConversations() {
  console.log('🚀 Starting community conversation backfill...');
  
  try {
    // 1. Get all existing communities
    console.log('📋 Fetching existing communities...');
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, name, created_at');

    if (communitiesError) {
      throw new Error(`Failed to fetch communities: ${communitiesError.message}`);
    }

    if (!communities || communities.length === 0) {
      console.log('✅ No communities found. Nothing to backfill.');
      return;
    }

    console.log(`📍 Found ${communities.length} communities to process`);

    // 2. Check which communities already have conversations
    const { data: existingConversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('community_id')
      .eq('conversation_type', 'community')
      .not('community_id', 'is', null);

    if (conversationsError) {
      throw new Error(`Failed to fetch existing conversations: ${conversationsError.message}`);
    }

    const existingCommunityIds = new Set(
      existingConversations?.map(c => c.community_id) || []
    );

    // 3. Filter communities that need conversations
    const communitiesNeedingConversations = communities.filter(
      community => !existingCommunityIds.has(community.id)
    );

    if (communitiesNeedingConversations.length === 0) {
      console.log('✅ All communities already have conversations. Nothing to backfill.');
      return;
    }

    console.log(`🔧 Creating conversations for ${communitiesNeedingConversations.length} communities...`);

    // 4. Process each community
    for (const community of communitiesNeedingConversations) {
      console.log(`  📝 Processing community: ${community.name} (${community.id})`);
      
      try {
        // Use the database function to create community conversation
        const { data, error } = await supabase.rpc('create_community_conversation', {
          p_community_id: community.id
        });

        if (error) {
          console.error(`    ❌ Failed to create conversation for ${community.name}: ${error.message}`);
          continue;
        }

        console.log(`    ✅ Created conversation ${data} for ${community.name}`);

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`    ❌ Error processing ${community.name}:`, error);
      }
    }

    console.log('🎉 Community conversation backfill completed!');

    // 5. Verify the results
    console.log('🔍 Verifying backfill results...');
    const { data: finalConversations, error: finalError } = await supabase
      .from('conversations')
      .select('community_id')
      .eq('conversation_type', 'community');

    if (finalError) {
      throw new Error(`Failed to verify results: ${finalError.message}`);
    }

    const totalCommunityConversations = finalConversations?.length || 0;
    console.log(`📊 Total community conversations: ${totalCommunityConversations}`);
    console.log(`📊 Total communities: ${communities.length}`);
    
    if (totalCommunityConversations === communities.length) {
      console.log('✅ All communities now have conversations!');
    } else {
      console.log('⚠️  Some communities may still be missing conversations.');
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill if this script is executed directly
if (require.main === module) {
  backfillCommunityConversations()
    .then(() => {
      console.log('✅ Backfill script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Backfill script failed:', error);
      process.exit(1);
    });
}

export { backfillCommunityConversations };