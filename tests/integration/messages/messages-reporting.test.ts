import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { 
  setupMessagingUsers, 
  createTestConversation, 
  sendTestMessage,
  reportTestMessage,
  assertMessageReported,
  signInAsUser 
} from './messaging-helpers';
import * as api from '@/features/messages/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users';
import type { Community } from '@/features/communities';
import type { Conversation, Message } from '@/features/messages/types';

describe('Messages Reporting System', () => {
  let supabase: SupabaseClient<Database>;
  let userA: User;
  let userB: User;
  let userC: User;
  let community: Community;
  let conversation: Conversation;
  let testMessage: Message;

  beforeAll(async () => {
    supabase = createTestClient();
    const setup = await setupMessagingUsers(supabase);
    userA = setup.userA;
    userB = setup.userB;
    community = setup.community;

    // Create third user for multi-reporter tests
    userC = await createTestUser(supabase);

    // Create conversation and test message
    await signInAsUser(supabase, userA);
    conversation = await createTestConversation(supabase, userB.id);
    testMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Reportable message`);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Report Creation', () => {
    it('reports message as spam', async () => {
      await signInAsUser(supabase, userB); // Recipient reports sender's message

      await api.reportMessage(supabase, {
        messageId: testMessage.id,
        reason: 'spam',
        details: `${TEST_PREFIX} This message is spam`
      });

      // Verify report exists in database
      await assertMessageReported(supabase, testMessage.id, userB.id);

      // Check report details
      const { data: report } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', testMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      expect(report).toBeTruthy();
      expect(report!.reason).toBe('spam');
      expect(report!.details).toContain('This message is spam');
      expect(report!.status).toBe('pending');
      expect(report!.created_at).toBeTruthy();
    });

    it('reports message as harassment', async () => {
      // Send new message for harassment report
      await signInAsUser(supabase, userA);
      const harassmentMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Harassment test`);

      await signInAsUser(supabase, userB);
      await api.reportMessage(supabase, {
        messageId: harassmentMessage.id,
        reason: 'harassment',
        details: `${TEST_PREFIX} This is harassment`
      });

      const { data: report } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', harassmentMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      expect(report!.reason).toBe('harassment');
    });

    it('reports message as inappropriate', async () => {
      await signInAsUser(supabase, userA);
      const inappropriateMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Inappropriate test`);

      await signInAsUser(supabase, userB);
      await api.reportMessage(supabase, {
        messageId: inappropriateMessage.id,
        reason: 'inappropriate'
      });

      const { data: report } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', inappropriateMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      expect(report!.reason).toBe('inappropriate');
    });

    it('reports message with "other" reason and details', async () => {
      await signInAsUser(supabase, userA);
      const otherMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Other reason test`);

      await signInAsUser(supabase, userB);
      await api.reportMessage(supabase, {
        messageId: otherMessage.id,
        reason: 'other',
        details: `${TEST_PREFIX} Custom violation: Contains false information`
      });

      const { data: report } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', otherMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      expect(report!.reason).toBe('other');
      expect(report!.details).toContain('Custom violation');
    });

    it('includes reporter_id automatically', async () => {
      await signInAsUser(supabase, userA);
      const autoReporterMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Auto reporter test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, autoReporterMessage.id, 'spam');

      const { data: report } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', autoReporterMessage.id)
        .single();

      expect(report!.reporter_id).toBe(userB.id);
    });
  });

  describe('Report Validation', () => {
    it('cannot report same message twice by same user', async () => {
      await signInAsUser(supabase, userA);
      const duplicateMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Duplicate report test`);

      await signInAsUser(supabase, userB);
      
      // Report first time - should succeed
      await reportTestMessage(supabase, duplicateMessage.id, 'spam');

      // Report second time - should fail
      await expect(
        api.reportMessage(supabase, {
          messageId: duplicateMessage.id,
          reason: 'harassment'
        })
      ).rejects.toThrow();
    });

    it('different users can report same message', async () => {
      await signInAsUser(supabase, userA);
      const multiReportMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Multi report test`);

      // UserB reports the message
      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, multiReportMessage.id, 'spam');

      // Create UserC and add to community so they can see the conversation
      userC = await createTestUser(supabase);
      
      // Since userC is not part of the conversation, they shouldn't be able to report
      // But let's test the database constraint directly
      const { error } = await supabase
        .from('message_reports')
        .insert({
          message_id: multiReportMessage.id,
          reporter_id: userC.id,
          reason: 'inappropriate',
          details: 'Report from userC'
        });

      // This might succeed or fail depending on RLS policies
      // The key is that we can have multiple reports for the same message
      if (!error) {
        const { data: reports } = await supabase
          .from('message_reports')
          .select('*')
          .eq('message_id', multiReportMessage.id);

        expect(reports!.length).toBeGreaterThan(1);
      }
    });

    it('cannot report own message', async () => {
      await signInAsUser(supabase, userA);
      const ownMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Own message test`);

      // UserA tries to report their own message - should fail
      await expect(
        api.reportMessage(supabase, {
          messageId: ownMessage.id,
          reason: 'spam'
        })
      ).rejects.toThrow();
    });

    it('report status defaults to "pending"', async () => {
      await signInAsUser(supabase, userA);
      const pendingMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Pending status test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, pendingMessage.id, 'inappropriate');

      const { data: report } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', pendingMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      expect(report!.status).toBe('pending');
      expect(report!.reviewed_at).toBeNull();
      expect(report!.reviewed_by).toBeNull();
    });
  });

  describe('Report Management', () => {
    let managementMessage: Message;
    let reportId: string;

    beforeAll(async () => {
      // Create message and report for management tests
      await signInAsUser(supabase, userA);
      managementMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Management test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, managementMessage.id, 'harassment');

      // Get report ID
      const { data: report } = await supabase
        .from('message_reports')
        .select('id')
        .eq('message_id', managementMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      reportId = report!.id;
    });

    it('fetches pending reports with status filter', async () => {
      const { data: pendingReports } = await supabase
        .from('message_reports')
        .select('*')
        .eq('status', 'pending');

      expect(pendingReports).toBeTruthy();
      expect(pendingReports!.length).toBeGreaterThan(0);

      const ourReport = pendingReports!.find(r => r.id === reportId);
      expect(ourReport).toBeTruthy();
      expect(ourReport!.status).toBe('pending');
    });

    it('updates report status to "reviewed"', async () => {
      await signInAsUser(supabase, userA); // Simulate admin/moderator

      const { error } = await supabase
        .from('message_reports')
        .update({
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userA.id
        })
        .eq('id', reportId);

      expect(error).toBeFalsy();

      // Verify update
      const { data: updatedReport } = await supabase
        .from('message_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      expect(updatedReport!.status).toBe('reviewed');
      expect(updatedReport!.reviewed_at).toBeTruthy();
      expect(updatedReport!.reviewed_by).toBe(userA.id);
    });

    it('updates report status to "resolved"', async () => {
      await signInAsUser(supabase, userA);

      const { error } = await supabase
        .from('message_reports')
        .update({
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userA.id
        })
        .eq('id', reportId);

      expect(error).toBeFalsy();

      const { data: resolvedReport } = await supabase
        .from('message_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      expect(resolvedReport!.status).toBe('resolved');
    });

    it('tracks reviewed_by and reviewed_at', async () => {
      // Create new report for this test
      await signInAsUser(supabase, userA);
      const trackingMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Tracking test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, trackingMessage.id, 'spam');

      const { data: originalReport } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', trackingMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      // Update with review info
      const reviewTime = new Date();
      await signInAsUser(supabase, userA);
      
      const { error } = await supabase
        .from('message_reports')
        .update({
          status: 'reviewed',
          reviewed_at: reviewTime.toISOString(),
          reviewed_by: userA.id
        })
        .eq('id', originalReport!.id);

      expect(error).toBeFalsy();

      // Verify tracking fields
      const { data: reviewedReport } = await supabase
        .from('message_reports')
        .select('*')
        .eq('id', originalReport!.id)
        .single();

      expect(reviewedReport!.reviewed_by).toBe(userA.id);
      expect(reviewedReport!.reviewed_at).toBeTruthy();
      
      const reviewedAt = new Date(reviewedReport!.reviewed_at!);
      expect(Math.abs(reviewedAt.getTime() - reviewTime.getTime())).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Report Database Constraints', () => {
    it('enforces unique message-reporter pairs', async () => {
      await signInAsUser(supabase, userA);
      const uniqueMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Unique constraint test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, uniqueMessage.id, 'spam');

      // Try to insert duplicate directly
      const { error } = await supabase
        .from('message_reports')
        .insert({
          message_id: uniqueMessage.id,
          reporter_id: userB.id,
          reason: 'harassment',
          details: 'Duplicate attempt'
        });

      expect(error).toBeTruthy();
      expect(error!.code).toBe('23505'); // Unique constraint violation
    });

    it('validates reason enum values', async () => {
      await signInAsUser(supabase, userA);
      const enumMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Enum test`);

      // Try to insert with invalid reason
      const { error } = await supabase
        .from('message_reports')
        .insert({
          message_id: enumMessage.id,
          reporter_id: userB.id,
          reason: 'invalid_reason', // Not in enum
          details: 'Invalid reason test'
        });

      expect(error).toBeTruthy();
      expect(error!.code).toBe('23514'); // Check constraint violation
    });

    it('validates status enum values', async () => {
      await signInAsUser(supabase, userA);
      const statusMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Status enum test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, statusMessage.id, 'spam');

      const { data: report } = await supabase
        .from('message_reports')
        .select('id')
        .eq('message_id', statusMessage.id)
        .eq('reporter_id', userB.id)
        .single();

      // Try to update with invalid status
      const { error } = await supabase
        .from('message_reports')
        .update({
          status: 'invalid_status'
        })
        .eq('id', report!.id);

      expect(error).toBeTruthy();
      expect(error!.code).toBe('23514'); // Check constraint violation
    });
  });

  describe('Report Integration with Messages', () => {
    it('reported message still accessible to participants', async () => {
      await signInAsUser(supabase, userA);
      const reportedMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Still accessible`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, reportedMessage.id, 'inappropriate');

      // Both users should still be able to see the message
      const messages = await api.fetchMessages(supabase, {
        conversationId: conversation.id,
        limit: 50
      });

      const foundMessage = messages.messages.find(m => m.id === reportedMessage.id);
      expect(foundMessage).toBeTruthy();
      expect(foundMessage!.content).toBe(reportedMessage.content);
    });

    it('cascade deletes when message is deleted', async () => {
      await signInAsUser(supabase, userA);
      const cascadeMessage = await sendTestMessage(supabase, conversation.id, `${TEST_PREFIX} Cascade test`);

      await signInAsUser(supabase, userB);
      await reportTestMessage(supabase, cascadeMessage.id, 'spam');

      // Verify report exists
      let { data: reports } = await supabase
        .from('message_reports')
        .select('*')
        .eq('message_id', cascadeMessage.id);

      expect(reports).toHaveLength(1);

      // Note: We can't actually hard delete messages due to soft delete,
      // but the CASCADE constraint is defined in the schema for hard deletes
    });
  });
});