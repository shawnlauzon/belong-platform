import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { ReportMessageInput, MessageReport } from '../types';

export async function reportMessage(
  _client: SupabaseClient<Database>,
  _input: ReportMessageInput
): Promise<MessageReport> {
  // TODO: Implement message reporting when message_reports table is created
  throw new Error('Message reporting is not yet implemented');
}