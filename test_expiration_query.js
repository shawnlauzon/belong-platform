// Quick test to see if the function call works in Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://localhost:54321', 'your-anon-key');

async function testQuery() {
  try {
    // Test the simple query that worked for you
    const { data, error } = await supabase
      .from('resources')
      .select('*, calculate_resource_expiration(type, last_renewed_at) as expires_at')
      .eq('status', 'open')
      .limit(1);
    
    console.log('Simple query result:', { data, error });
    
    // Test with joins
    const { data: data2, error: error2 } = await supabase
      .from('resources')
      .select(`
        *,
        resource_communities!inner(community_id),
        resource_timeslots(*),
        calculate_resource_expiration(type, last_renewed_at) as expires_at
      `)
      .eq('status', 'open')
      .limit(1);
      
    console.log('Query with joins result:', { data: data2, error: error2 });
    
  } catch (err) {
    console.error('Error:', err);
  }
}

testQuery();