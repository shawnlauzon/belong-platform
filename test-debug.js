import { createTestClient } from './tests/integration/helpers/test-client.js';
import { createTestUser, createTestCommunity, createTestResource, createTestShoutout } from './tests/integration/helpers/test-data.js';
import { createComment, deleteComment } from './src/features/comments/index.js';
import { signIn } from './src/features/auth/api/index.js';
import { joinCommunity } from './src/features/communities/api/index.js';

async function test() {
  const supabase = createTestClient();
  
  // Create users and community
  const sender = await createTestUser(supabase);
  console.log('Sender ID:', sender.id);
  
  const testCommunity = await createTestCommunity(supabase);
  
  const receiver = await createTestUser(supabase);
  await joinCommunity(supabase, testCommunity.id);
  console.log('Receiver ID:', receiver.id);
  
  // Create resource and shoutout as sender
  await signIn(supabase, sender.email, 'TestPass123!');
  const resource = await createTestResource(supabase, testCommunity.id, 'offer');
  
  const shoutout = await createTestShoutout({
    supabase,
    resourceId: resource.id,
    receiverId: receiver.id,
    communityId: testCommunity.id,
  });
  
  // Create comment as commenter
  const commenter = await createTestUser(supabase);
  await joinCommunity(supabase, testCommunity.id);
  console.log('Commenter ID:', commenter.id);
  
  const comment = await createComment(supabase, {
    content: 'Test comment',
    shoutoutId: shoutout.id,
  });
  console.log('Comment author_id:', comment.authorId);
  console.log('Comment created by:', comment.author?.firstName);
  
  // Try to delete as receiver
  await signIn(supabase, receiver.email, 'TestPass123!');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user ID after signing in as receiver:', user?.id);
  
  try {
    const result = await deleteComment(supabase, comment.id);
    console.log('DELETE SUCCEEDED - THIS IS THE BUG!');
    console.log('Result:', result);
  } catch (error) {
    console.log('Delete failed as expected:', error.message);
  }
}

test().catch(console.error);
