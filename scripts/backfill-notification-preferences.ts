import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { Database } from '../src/shared/types/database';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY',
  );
  process.exit(1);
}

// Create Supabase client with service key for admin access
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function backfillNotificationPreferences() {
  console.log('🔔 Starting backfill of notification preferences...');

  try {
    // Find all users who don't have notification preferences
    const { data: usersWithoutPrefs, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .not('id', 'in', 
        supabase
          .from('notification_preferences')
          .select('user_id')
      );

    if (findError) {
      throw findError;
    }

    if (!usersWithoutPrefs || usersWithoutPrefs.length === 0) {
      console.log('✅ All users already have notification preferences');
      return;
    }

    console.log(`📊 Found ${usersWithoutPrefs.length} users without notification preferences`);

    // Create default group-level preferences for each user
    const defaultPreferencesTemplate = {
      // Group-level notification controls (7 groups, all enabled by default)
      social_interactions: true,      // Controls: comments, replies, shoutouts, connections
      my_resources: true,            // Controls: resource claims, cancellations, completions
      my_registrations: true,        // Controls: claim approvals, rejections, resource updates/cancellations
      my_communities: true,          // Controls: member joins/leaves for communities you organize
      community_activity: true,      // Controls: new resources/events in communities you're a member of
      trust_recognition: true,       // Controls: trust points and level changes
      // Messages (granular control as documented)
      direct_messages: true,         // Direct 1:1 messages
      community_messages: true,      // Community chat messages
      // Global settings (disabled by default for privacy)
      email_enabled: false,
      push_enabled: false,
    };

    // Prepare batch insert data
    const preferencesToInsert = usersWithoutPrefs.map(user => ({
      user_id: user.id,
      ...defaultPreferencesTemplate,
    }));

    // Insert preferences in batches of 100 to avoid query limits
    const batchSize = 100;
    let processed = 0;
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < preferencesToInsert.length; i += batchSize) {
      const batch = preferencesToInsert.slice(i, i + batchSize);
      
      try {
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert(batch);

        if (insertError) {
          console.error(`❌ Failed to insert batch ${i / batchSize + 1}:`, insertError);
          failed += batch.length;
        } else {
          console.log(`✅ Processed batch ${i / batchSize + 1} (${batch.length} users)`);
          successful += batch.length;
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${i / batchSize + 1}:`, error);
        failed += batch.length;
      }

      processed += batch.length;
      
      if (processed % 500 === 0) {
        console.log(`📈 Progress: ${processed}/${preferencesToInsert.length} users processed`);
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(`✅ Successfully created preferences: ${successful} users`);
    console.log(`❌ Failed to create preferences: ${failed} users`);
    console.log(`📊 Total processed: ${processed} users`);

    if (failed > 0) {
      console.log('\n⚠️  Some users failed to get preferences. Check logs above for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 Backfill completed successfully!');
    }

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillNotificationPreferences();