import { supabase } from '@/lib/supabase';
import { mockResources } from '@/api/mockData';

export async function seedResources() {
  try {
    // First check if resources already exist
    const { count } = await supabase
      .from('resources')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      console.log('Resources already seeded, skipping...');
      return;
    }

    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Must be authenticated to seed resources');
      return;
    }

    // Insert mock resources - set the current user as the member_id
    const { error } = await supabase
      .from('resources')
      .insert(mockResources.map(resource => ({
        ...resource,
        member_id: user.id, // Use the current user's ID
        location: `POINT(${resource.location.lng} ${resource.location.lat})`, // Convert to PostGIS point
        created_at: new Date(resource.created_at).toISOString()
      })));

    if (error) throw error;
    console.log('Successfully seeded resources');
  } catch (error) {
    console.error('Error seeding resources:', error);
  }
}