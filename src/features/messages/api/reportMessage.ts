import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { ReportMessageInput, MessageReport, MessageReportReason, MessageReportStatus } from '../types';
import { logger } from '../../../shared';

export async function reportMessage(
  client: SupabaseClient<Database>,
  input: ReportMessageInput
): Promise<MessageReport> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  const { data, error } = await client
    .from('message_reports')
    .insert({
      message_id: input.messageId,
      reporter_id: userId,
      reason: input.reason,
      details: input.details,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('You have already reported this message');
    }
    logger.error('Error reporting message', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Failed to report message');
  }

  return {
    id: data.id,
    messageId: data.message_id,
    reporterId: data.reporter_id,
    reason: data.reason as MessageReportReason,
    details: data.details,
    createdAt: new Date(data.created_at),
    status: data.status as MessageReportStatus,
    reviewedAt: data.reviewed_at ? new Date(data.reviewed_at) : null,
    reviewedBy: data.reviewed_by,
  };
}