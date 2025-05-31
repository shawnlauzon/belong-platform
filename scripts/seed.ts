import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { mockResources } from '../src/api/mockData.js';
import type { Database } from '../src/types/database';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
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

    // Insert mock resources
    const { error } = await supabase
      .from('resources')
      .insert(mockResources.map(resource => ({
        ...resource,
        location: `POINT(${resource.location.lng} ${resource.location.lat})`,
        created_at: new Date(resource.created_at).toISOString()
      })));

    if (error) throw error;
    console.log('Successfully seeded resources');
  } catch (error) {
    console.error('Error seeding resources:', error);
    process.exit(1);
  }
}

// Run seeding
seedResources();