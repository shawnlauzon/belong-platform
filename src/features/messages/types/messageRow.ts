import { Database } from '../../../shared/types/database';

export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];

export type ConversationInsert = Database['public']['Tables']['conversations']['Insert'];
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update'];
export type ConversationRow = Database['public']['Tables']['conversations']['Row'];

export type ConversationParticipantInsert = Database['public']['Tables']['conversation_participants']['Insert'];
export type ConversationParticipantUpdate = Database['public']['Tables']['conversation_participants']['Update'];

export type MessageStatusInsert = Database['public']['Tables']['message_status']['Insert'];
export type MessageStatusUpdate = Database['public']['Tables']['message_status']['Update'];

export type MessageReportInsert = Database['public']['Tables']['message_reports']['Insert'];
export type MessageReportUpdate = Database['public']['Tables']['message_reports']['Update'];

export type BlockedUserInsert = Database['public']['Tables']['blocked_users']['Insert'];

export type MessageWithSender = MessageRow & {
  sender: Database['public']['Tables']['profiles']['Row'];
};

export type ConversationWithParticipants = ConversationRow & {
  conversation_participants: Array<{
    user_id: string;
    unread_count: number;
    last_read_at: string | null;
    profiles: Database['public']['Tables']['profiles']['Row'];
  }>;
};

export type MessageWithStatus = MessageRow & {
  message_status: Database['public']['Tables']['message_status']['Row'][];
};