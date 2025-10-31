/**
 * Email Preview Test Suite
 *
 * Purpose: Generate real email notifications sent to Postmark sandbox for manual review
 *
 * SETUP:
 * 1. Define POSTMARK_NOTIFICATION_* variables in .env.test.local:
 *    - POSTMARK_NOTIFICATION_SERVER_TOKEN
 *    - POSTMARK_NOTIFICATION_FROM_EMAIL
 *    - POSTMARK_NOTIFICATION_MESSAGE_STREAM
 *    - VITE_APP_URL
 *
 * 2. Set TEST_EMAIL_PREVIEW=true to enable these tests
 *
 * USAGE:
 * - Run all email preview tests: `pnpm test:email-preview`
 * - Run specific type: `pnpm test:email-preview -t "event.created"`
 *
 * VERIFICATION:
 * After running tests, check Postmark sandbox UI to review:
 * - Email formatting and layout
 * - Content rendering (long titles, special characters, etc.)
 * - CTA buttons and links
 * - Missing data handling (avatar, optional fields)
 * - Timestamp formatting
 * - Community name display
 *
 * CURRENT IMPLEMENTATION STATUS:
 * - ✅ event.created - ACTIVE (template ID 42024291)
 * - ⏸️  All other notification types - SKIPPED (awaiting template implementation in edge function)
 *
 * To enable additional notification types:
 * 1. Create Postmark templates for each notification type
 * 2. Update send-email-notification edge function to map action types to template IDs
 * 3. Remove .skip from the corresponding tests below
 *
 * NOTE: Tests are skipped when TEST_EMAIL_PREVIEW is not set to avoid accidental email sends in CI
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
  createTestShoutout,
  createTestConnection,
  signInAsUser,
} from '../helpers/test-data';
import { createComment } from '@/features/comments';
import { joinCommunity } from '@/features/communities/api';
import { startConversation, sendMessage } from '@/features/messaging/api';
import {
  createResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';
import type { Resource } from '@/features/resources';
import { faker } from '@faker-js/faker';

// Skip all tests in this suite unless TEST_EMAIL_PREVIEW is explicitly set
const describeIf =
  process.env.TEST_EMAIL_PREVIEW === 'true' ? describe : describe.skip;

describeIf('Email Preview - Manual Verification', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let otherUser: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create base test users and community
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    otherUser = await createTestUser(supabase);
    await joinCommunity(supabase, otherUser.id, testCommunity.id);
  });

  afterAll(async () => {
    // await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Reset to resource owner for consistency
    await signInAsUser(supabase, resourceOwner);
  });

  /**
   * Helper: Enable email notifications for a specific type
   * Note: Must be called while signed in as the user whose preferences are being updated
   */
  async function enableEmailForType(
    userId: string,
    notificationType: string,
  ): Promise<void> {
    // Get current user to restore later
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Sign in as the target user (required for RLS)
    const userAccount = userId === resourceOwner.id ? resourceOwner : otherUser;
    await signInAsUser(supabase, userAccount);

    const { error } = await supabase
      .from('notification_preferences')
      .update({
        notifications_enabled: true,
        [notificationType]: {
          in_app: true,
          push: false,
          email: true,
        },
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(
        `Failed to enable email for ${notificationType}: ${error.message}`,
      );
    }

    // Verify the update succeeded
    const { data, error: verifyError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (verifyError || !data) {
      throw new Error(
        `No notification preferences found for user ${userId}. Preferences should be created automatically when user is created.`,
      );
    }

    // Restore original user if needed
    if (currentUser && currentUser.id !== userId) {
      const originalAccount = currentUser.id === resourceOwner.id ? resourceOwner : otherUser;
      await signInAsUser(supabase, originalAccount);
    }
  }

  describe('Comments', () => {
    describe('resource.commented', () => {
      it.skip('sends email when someone comments on your resource (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'resource_commented');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        await signInAsUser(supabase, otherUser);
        await createComment(supabase, otherUser.id, {
          content: 'This is a helpful resource, thank you for sharing!',
          resourceId: resource.id,
        });

        // Email should be sent to resourceOwner
        console.log('✉️  Email sent for resource.commented (standard case)');
      });

      it.skip('sends email with long resource title', async () => {
        await enableEmailForType(resourceOwner.id, 'resource_commented');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        // Update to have very long title
        await supabase
          .from('resources')
          .update({
            title:
              'This is an extremely long resource title that might wrap or get truncated in the email template and we want to see how it renders',
          })
          .eq('id', resource.id);

        await signInAsUser(supabase, otherUser);
        await createComment(supabase, otherUser.id, {
          content: 'Comment on long title resource',
          resourceId: resource.id,
        });

        console.log('✉️  Email sent for resource.commented (long title)');
      });

      it.skip('sends email with special characters in content', async () => {
        await enableEmailForType(resourceOwner.id, 'resource_commented');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        await signInAsUser(supabase, otherUser);
        await createComment(supabase, otherUser.id, {
          content:
            "Great resource! 🎉 Can't wait to use it. Price: $10-$20 @ 50% off",
          resourceId: resource.id,
        });

        console.log(
          '✉️  Email sent for resource.commented (special characters)',
        );
      });
    });

    describe('comment.replied', () => {
      it.skip('sends email when someone replies to your comment (standard)', async () => {
        await enableEmailForType(otherUser.id, 'comment_replied');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        // otherUser makes original comment
        await signInAsUser(supabase, otherUser);
        const originalComment = await createComment(supabase, otherUser.id, {
          content: 'Is this still available?',
          resourceId: resource.id,
        });

        // resourceOwner replies
        await signInAsUser(supabase, resourceOwner);
        await createComment(supabase, resourceOwner.id, {
          content: 'Yes, still available! Let me know when you can pick it up.',
          resourceId: resource.id,
          parentId: originalComment.id,
        });

        console.log('✉️  Email sent for comment.replied (standard case)');
      });
    });
  });

  describe('Claims', () => {
    describe('claim.created', () => {
      it.skip('sends email when someone claims your resource (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'claim_created');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'I would love to use this resource!',
        });

        console.log('✉️  Email sent for claim.created (standard case)');
      });

      it.skip('sends email with long claim message', async () => {
        await enableEmailForType(resourceOwner.id, 'claim_created');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes:
            'I am very interested in this resource because it would really help me with my project. I have been looking for something like this for a long time and I think it would be perfect for what I need. Please let me know if it is still available.',
        });

        console.log('✉️  Email sent for claim.created (long message)');
      });
    });

    describe('claim.cancelled', () => {
      it.skip('sends email when someone cancels their claim (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'claim_cancelled');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        // Create and cancel claim
        await signInAsUser(supabase, otherUser);
        const claim = await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'Actually I need to cancel this',
        });

        await updateResourceClaim(supabase, {
          id: claim.id,
          status: 'cancelled',
        });

        console.log('✉️  Email sent for claim.cancelled (standard case)');
      });
    });

    describe('claim.responded', () => {
      it.skip('sends email when owner approves your claim (standard)', async () => {
        await enableEmailForType(otherUser.id, 'claim_responded');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
          undefined,
          true,
        ); // requiresApproval=true
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        const claim = await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'I would like this resource',
        });

        await signInAsUser(supabase, resourceOwner);
        await updateResourceClaim(supabase, {
          id: claim.id,
          status: 'approved',
        });

        console.log('✉️  Email sent for claim.responded (approved)');
      });

      it.skip('sends email when owner rejects your claim (standard)', async () => {
        await enableEmailForType(otherUser.id, 'claim_responded');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
          undefined,
          true,
        ); // requiresApproval=true
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        const claim = await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'Can I claim this?',
        });

        await signInAsUser(supabase, resourceOwner);
        await updateResourceClaim(supabase, {
          id: claim.id,
          status: 'rejected',
        });

        console.log('✉️  Email sent for claim.responded (rejected)');
      });
    });
  });

  describe('Transaction Confirmation', () => {
    describe('resource.given', () => {
      it.skip('sends email when other party marks as given (offer - claimant confirms)', async () => {
        await enableEmailForType(otherUser.id, 'resource_given');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        const claim = await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'I would like this',
        });

        await signInAsUser(supabase, resourceOwner);
        // Owner (giver) marks as given
        await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

        console.log('✉️  Email sent for resource.given (offer scenario)');
      });

      it.skip('sends email when other party marks as given (favor - owner confirms)', async () => {
        await enableEmailForType(resourceOwner.id, 'resource_given');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'request',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        const claim = await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'I can help with this',
        });

        // Claimant (giver in favor) marks as given
        await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

        console.log('✉️  Email sent for resource.given (favor scenario)');
      });
    });

    describe('resource.received', () => {
      it.skip('sends email when other party marks as received (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'resource_received');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        const claim = await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'I need this',
        });

        // Claimant marks as received
        await updateResourceClaim(supabase, {
          id: claim.id,
          status: 'received',
        });

        console.log('✉️  Email sent for resource.received (standard case)');
      });
    });
  });

  describe('Resources & Events', () => {
    describe('resource.created', () => {
      it.skip('sends email when new resource created in community (standard)', async () => {
        await enableEmailForType(otherUser.id, 'resource_created');

        await createTestResource(supabase, testCommunity.id, 'offer');

        console.log('✉️  Email sent for resource.created (standard case)');
      });

      it.skip('sends email with long community name', async () => {
        await enableEmailForType(otherUser.id, 'resource_created');

        // Create community with long name
        const longNameCommunity = await createTestCommunity(supabase);
        await supabase
          .from('communities')
          .update({
            name: 'San Francisco Bay Area Mutual Aid and Resource Sharing Network',
          })
          .eq('id', longNameCommunity.id);

        await signInAsUser(supabase, otherUser);
        await joinCommunity(supabase, otherUser.id, longNameCommunity.id);

        await signInAsUser(supabase, resourceOwner);
        await createTestResource(supabase, longNameCommunity.id, 'offer');

        console.log(
          '✉️  Email sent for resource.created (long community name)',
        );
      });
    });

    describe('event.created', () => {
      it('sends email when new event created in community (standard)', async () => {
        console.log('🔍 Starting email test for event.created');

        // Enable email for otherUser (will throw if preferences don't exist)
        console.log('🔍 Enabling email for user:', otherUser.id);
        await enableEmailForType(otherUser.id, 'event_created');
        console.log('✅ Email preferences enabled successfully');

        const event = await createTestResource(
          supabase,
          testCommunity.id,
          'event',
        );
        console.log('🔍 Created event:', event.id);

        const timeslot = await createTestResourceTimeslot(supabase, event.id);
        console.log('🔍 Created timeslot:', timeslot.id);

        // Wait a bit for async notification processing
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if notification was created
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', otherUser.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (notifError) {
          console.error('❌ Failed to query notifications:', notifError);
          throw notifError;
        }

        console.log(
          `📬 Found ${notifications?.length || 0} notification(s) for user`,
        );
        if (notifications && notifications.length > 0) {
          console.log(
            '🔍 Most recent notification:',
            JSON.stringify(notifications[0], null, 2),
          );
        } else {
          console.warn(
            '⚠️  No notifications found - notification may not have been created',
          );
        }

        // Check pg_net responses (Edge Function calls)
        const { data: httpResponses, error: httpError } = await supabase.rpc(
          'exec_sql',
          {
            sql_query: `SELECT id, status_code, content::text, error_msg, created
                        FROM net._http_response
                        ORDER BY created DESC
                        LIMIT 5;`,
          },
        );

        if (httpError) {
          console.log(
            '🔍 Could not query pg_net responses (trying direct query)',
          );
          // Try direct query as fallback
          const { data: directData, error: directError } = await supabase
            .schema('net')
            .from('_http_response')
            .select('*')
            .order('created', { ascending: false })
            .limit(5);

          if (!directError && directData) {
            console.log(
              '📡 Recent HTTP responses:',
              JSON.stringify(directData, null, 2),
            );
          } else {
            console.log(
              '⚠️  Cannot access pg_net responses - check logs manually',
            );
          }
        } else {
          console.log(
            '📡 Recent HTTP responses:',
            JSON.stringify(httpResponses, null, 2),
          );
        }

        console.log('✉️  Test completed - check Postmark for email');
      });

      it('sends email with future event timestamp', async () => {
        await enableEmailForType(otherUser.id, 'event_created');

        const event = await createTestResource(
          supabase,
          testCommunity.id,
          'event',
        );

        // Create timeslot in future
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        await supabase.from('resource_timeslots').insert({
          resource_id: event.id,
          start_time: futureDate.toISOString(),
          end_time: new Date(
            futureDate.getTime() + 2 * 60 * 60 * 1000,
          ).toISOString(),
          status: 'active',
        });

        console.log('✉️  Email sent for event.created (future timestamp)');
      });

      it('sends email with long event title', async () => {
        await enableEmailForType(otherUser.id, 'event_created');

        const event = await createTestResource(
          supabase,
          testCommunity.id,
          'event',
        );

        await supabase
          .from('resources')
          .update({
            title:
              'Community Garden Spring Planting Day and Potluck Celebration with Live Music and Kids Activities',
          })
          .eq('id', event.id);

        await createTestResourceTimeslot(supabase, event.id);

        console.log('✉️  Email sent for event.created (long title)');
      });
    });

    describe('resource.updated', () => {
      it.skip('sends email when claimed resource is updated (standard)', async () => {
        await enableEmailForType(otherUser.id, 'resource_updated');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );
        const timeslot = await createTestResourceTimeslot(
          supabase,
          resource.id,
        );

        await signInAsUser(supabase, otherUser);
        await createResourceClaim(supabase, {
          resourceId: resource.id,
          timeslotId: timeslot.id,
          notes: 'I want this',
        });

        await signInAsUser(supabase, resourceOwner);
        await supabase
          .from('resources')
          .update({
            description: 'Updated description with new details',
          })
          .eq('id', resource.id);

        console.log('✉️  Email sent for resource.updated (standard case)');
      });
    });

    describe('event.updated', () => {
      it.skip('sends email when claimed event is updated (standard)', async () => {
        await enableEmailForType(otherUser.id, 'event_updated');

        const event = await createTestResource(
          supabase,
          testCommunity.id,
          'event',
        );
        const timeslot = await createTestResourceTimeslot(supabase, event.id);

        await signInAsUser(supabase, otherUser);
        await createResourceClaim(supabase, {
          resourceId: event.id,
          timeslotId: timeslot.id,
          notes: 'I will attend',
        });

        await signInAsUser(supabase, resourceOwner);
        await supabase
          .from('resources')
          .update({
            location_name: 'New Location - Building B',
          })
          .eq('id', event.id);

        console.log('✉️  Email sent for event.updated (standard case)');
      });
    });

    describe('event.cancelled', () => {
      it.skip('sends email when claimed event is cancelled (standard)', async () => {
        await enableEmailForType(otherUser.id, 'event_cancelled');

        const event = await createTestResource(
          supabase,
          testCommunity.id,
          'event',
        );
        const timeslot = await createTestResourceTimeslot(supabase, event.id);

        await signInAsUser(supabase, otherUser);
        await createResourceClaim(supabase, {
          resourceId: event.id,
          timeslotId: timeslot.id,
          notes: 'Count me in!',
        });

        await signInAsUser(supabase, resourceOwner);
        await supabase
          .from('resources')
          .update({
            status: 'inactive',
          })
          .eq('id', event.id);

        console.log('✉️  Email sent for event.cancelled (standard case)');
      });
    });

    describe('resource.expiring', () => {
      it.skip('sends email when your resource is expiring soon (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'resource_expiring');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        // Manually trigger expiring notification by setting last_renewed_at to old date
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 25); // 25 days ago (expires at 30)

        await supabase
          .from('resources')
          .update({
            last_renewed_at: oldDate.toISOString(),
          })
          .eq('id', resource.id);

        // Note: This notification is typically triggered by a scheduled job
        // For testing, we may need to manually insert the notification
        console.log('✉️  Email sent for resource.expiring (standard case)');
      });
    });

    describe('event.starting', () => {
      it.skip('sends email when your event is starting soon (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'event_starting');

        const event = await createTestResource(
          supabase,
          testCommunity.id,
          'event',
        );

        // Create timeslot starting in 1 hour
        const soonDate = new Date();
        soonDate.setHours(soonDate.getHours() + 1);

        await supabase.from('resource_timeslots').insert({
          resource_id: event.id,
          start_time: soonDate.toISOString(),
          end_time: new Date(
            soonDate.getTime() + 2 * 60 * 60 * 1000,
          ).toISOString(),
          status: 'active',
        });

        // Note: This notification is typically triggered by a scheduled job
        console.log('✉️  Email sent for event.starting (standard case)');
      });
    });
  });

  describe('Social', () => {
    describe('message.received', () => {
      it.skip('sends email when you receive a message (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'message_received');

        await signInAsUser(supabase, otherUser);

        // Start conversation between otherUser and resourceOwner
        const conversation = await startConversation(supabase, {
          otherUserId: resourceOwner.id,
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        await sendMessage(supabase, user.id, {
          conversationId: conversation.id,
          content: 'Hey, I have a question about your resource',
        });

        console.log('✉️  Email sent for message.received (standard case)');
      });

      it.skip('sends email with long message content', async () => {
        await enableEmailForType(resourceOwner.id, 'message_received');

        await signInAsUser(supabase, otherUser);

        const conversation = await startConversation(supabase, {
          otherUserId: resourceOwner.id,
        });

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        await sendMessage(supabase, user.id, {
          conversationId: conversation.id,
          content:
            'I wanted to reach out because I saw your post and I think it would be really helpful for my situation. I have been looking for something like this for quite some time now and I believe this could be exactly what I need. Would you be available to discuss this further? I am flexible with timing and can work around your schedule.',
        });

        console.log('✉️  Email sent for message.received (long message)');
      });
    });

    describe('conversation.requested', () => {
      it.skip('sends email when someone requests to chat (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'conversation_requested');

        await signInAsUser(supabase, otherUser);

        // Starting a conversation triggers conversation.requested notification
        await startConversation(supabase, {
          otherUserId: resourceOwner.id,
        });

        console.log(
          '✉️  Email sent for conversation.requested (standard case)',
        );
      });
    });

    describe('shoutout.received', () => {
      it.skip('sends email when you receive a shoutout (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'shoutout_received');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        await signInAsUser(supabase, otherUser);
        await createTestShoutout(supabase, {
          receiverId: resourceOwner.id,
          communityId: testCommunity.id,
          resourceId: resource.id,
          message: 'Thank you for sharing this amazing resource!',
        });

        console.log('✉️  Email sent for shoutout.received (standard case)');
      });

      it.skip('sends email with long shoutout message', async () => {
        await enableEmailForType(resourceOwner.id, 'shoutout_received');

        const resource = await createTestResource(
          supabase,
          testCommunity.id,
          'offer',
        );

        await signInAsUser(supabase, otherUser);
        await createTestShoutout(supabase, {
          receiverId: resourceOwner.id,
          communityId: testCommunity.id,
          resourceId: resource.id,
          message:
            'I just wanted to take a moment to express my sincere gratitude for sharing this wonderful resource with our community. It has been incredibly helpful and has made a real difference in my life. Thank you so much for your generosity and kindness!',
        });

        console.log('✉️  Email sent for shoutout.received (long message)');
      });
    });

    describe('membership.updated', () => {
      it.skip('sends email when member joins your community (standard)', async () => {
        // Create a new user as organizer with email enabled
        await signInAsUser(supabase, resourceOwner);
        await enableEmailForType(resourceOwner.id, 'membership_updated');

        const newMember = await createTestUser(supabase);
        await joinCommunity(supabase, newMember.id, testCommunity.id);

        console.log('✉️  Email sent for membership.updated (member.joined)');
      });

      it.skip('sends email when member leaves your community (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'membership_updated');

        const leavingMember = await createTestUser(supabase);
        await joinCommunity(supabase, leavingMember.id, testCommunity.id);

        // Member leaves
        await supabase
          .from('community_memberships')
          .delete()
          .eq('user_id', leavingMember.id)
          .eq('community_id', testCommunity.id);

        console.log('✉️  Email sent for membership.updated (member.left)');
      });
    });
  });

  describe('System', () => {
    describe('trustlevel.changed', () => {
      it.skip('sends email when your trust level changes (standard)', async () => {
        await enableEmailForType(resourceOwner.id, 'trustlevel_changed');

        // Manually update trust score to trigger level change
        const { data: currentScore } = await supabase
          .from('trust_scores')
          .select('total_score')
          .eq('user_id', resourceOwner.id)
          .eq('community_id', testCommunity.id)
          .single();

        if (currentScore) {
          // Add enough points to trigger level change (assuming levels are 100 points apart)
          await supabase
            .from('trust_scores')
            .update({
              total_score: currentScore.total_score + 150,
            })
            .eq('user_id', resourceOwner.id)
            .eq('community_id', testCommunity.id);
        }

        console.log('✉️  Email sent for trustlevel.changed (standard case)');
      });
    });
  });
});
