import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { mockResources } from '../src/api/mockData.js';
import type { Database } from '@/shared/types/database';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const seedMemberId = process.env.SEED_MEMBER_ID;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing required environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY',
  );
  process.exit(1);
}

if (!seedMemberId) {
  console.error('Missing required environment variable: SEED_MEMBER_ID');
  console.error('Please add SEED_MEMBER_ID=your_user_id to your .env file');
  process.exit(1);
}

// Create Supabase client with service key for admin access
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function seedResources() {
  try {
    // Check if resources already exist
    const { count, error: countError } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    if (count && count > 0) {
      console.log('Resources already seeded, skipping...');
      return;
    }

    // Insert mock resources using the provided SEED_MEMBER_ID
    const { error } = await supabase.from('resources').insert(
      mockResources.map(({ owner, ...resource }) => ({
        ...resource,
        creator_id: seedMemberId,
        location: `POINT(${resource.location.lng} ${resource.location.lat})`,
        created_at: new Date(resource.created_at).toISOString(),
      })),
    );

    if (error) throw error;
    console.log('Successfully seeded resources');
  } catch (error) {
    console.error('Error seeding resources:', error);
    process.exit(1);
  }
}

// Run seeding
seedResources();
