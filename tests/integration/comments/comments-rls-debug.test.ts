import { describe, it, expect } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('Comments RLS Debug', () => {
  let supabase: SupabaseClient<Database>;
  let serviceSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    supabase = createTestClient();
    serviceSupabase = createServiceClient();
  });

  it('should directly test UPDATE operation on existing comment', async () => {
    const userId = '05909f43-2695-4e11-afd2-c54eea70617f';
    const commentId = '8932cb40-197a-4d92-96bf-be36de9f2f83';

    // Check what URL we're connecting to
    console.log('🐛 Supabase URL:', process.env.VITE_SUPABASE_URL);
    console.log('🐛 Expected local URL: http://127.0.0.1:54321');

    // Check what database we're connected to
    const { data: dbCheck } = await supabase.rpc('version');
    console.log('🐛 Database version:', dbCheck);

    // Check with service client (bypasses RLS)
    const { data: allUsersService } = await serviceSupabase
      .from('profiles')
      .select('id, email')
      .limit(5);
    console.log('🐛 Sample users in DB (service client):', allUsersService);

    // Check with regular client (subject to RLS)
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(5);
    console.log('🐛 Sample users in DB (regular client):', allUsers);

    const { data: userCheck, error: userCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('🐛 User check:', userCheck, 'Error:', userCheckError);

    // Check if the comment exists with service client
    const { data: commentCheckService, error: commentCheckServiceError } = await serviceSupabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    console.log('🐛 Comment check (service):', commentCheckService, 'Error:', commentCheckServiceError);

    // Check if the comment exists with regular client
    const { data: commentCheck, error: commentCheckError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    console.log('🐛 Comment check (regular):', commentCheck, 'Error:', commentCheckError);

    // Sign in as the user (assuming they have email and we need to create a session)
    // For this test, let's try to set the auth context manually if possible
    
    // Attempt direct UPDATE without authentication first to see the difference
    console.log('🐛 Attempting UPDATE without auth...');
    const { data: updateWithoutAuth, error: errorWithoutAuth } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId);
    
    console.log('🐛 Update without auth - Data:', updateWithoutAuth, 'Error:', errorWithoutAuth);

    // Now let's sign in as the specific user and test UPDATE
    console.log('🐛 Attempting to sign in as user...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test_int_torey.bins98@example.com',
      password: 'TestPass123!' // Standard test password
    });
    
    console.log('🐛 Sign in result:', signInData?.user?.id, 'Error:', signInError);

    if (signInData.user) {
      // Check auth state
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🐛 Current auth user:', user?.id);
      console.log('🐛 Comment author_id:', commentCheckService?.author_id);
      console.log('🐛 Auth match:', user?.id === commentCheckService?.author_id);

      console.log('🐛 Attempting UPDATE with auth...');
      const { data: updateWithAuth, error: errorWithAuth } = await supabase
        .from('comments')
        .update({ is_deleted: true })
        .eq('id', commentId);
      
      console.log('🐛 Update with auth - Data:', updateWithAuth, 'Error:', errorWithAuth);

      // If the update worked, let's try to revert it
      if (!errorWithAuth) {
        console.log('🐛 UPDATE succeeded! Reverting...');
        const { data: revertData, error: revertError } = await serviceSupabase
          .from('comments')
          .update({ is_deleted: false })
          .eq('id', commentId);
        console.log('🐛 Revert result:', revertData, 'Error:', revertError);
      }
    }

    // This test is just for debugging, so we don't assert anything
    expect(true).toBe(true);
  });
});