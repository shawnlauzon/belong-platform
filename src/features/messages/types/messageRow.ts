import { Database } from '../../../shared/types/database';
import { PublicProfileSummaryRow } from '../../users/types/publicProfileRow';

export const SELECT_CONVERSATIONS_JOIN_PARTICIPANTS = `*, conversation_participants!inner(user_id)`;

export const SELECT_CONVERSATIONS_WITH_LAST_MESSAGE = `
  *,
  conversation_participants!inner(user_id),
  last_message:messages!inner(
    id,
    content,
    sender_id,
    created_at,
    is_deleted
  )
`;

export type ConversationRowWithParticipants =
  Database['public']['Tables']['conversations']['Row'] & {
    conversation_participants: Array<{
      user_id: string;
    }>;
  };

export type ConversationRowWithLastMessage =
  Database['public']['Tables']['conversations']['Row'] & {
    conversation_participants: Array<{
      user_id: string;
    }>;
    last_message: Array<MessageRow>;
  };

export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];

export type ConversationInsert =
  Database['public']['Tables']['conversations']['Insert'];
export type ConversationUpdate =
  Database['public']['Tables']['conversations']['Update'];
export type ConversationRow =
  Database['public']['Tables']['conversations']['Row'];

export type ConversationParticipantInsert =
  Database['public']['Tables']['conversation_participants']['Insert'];
export type ConversationParticipantUpdate =
  Database['public']['Tables']['conversation_participants']['Update'];

export type BlockedUserInsert =
  Database['public']['Tables']['blocked_users']['Insert'];

export type MessageWithSender = MessageRow & {
  sender: Database['public']['Tables']['profiles']['Row'];
};

export type ConversationWithParticipants = ConversationRow & {
  conversation_participants: Array<{
    user_id: string;
    unread_count: number;
    last_read_at: string | null;
    public_profiles: PublicProfileSummaryRow;
  }>;
};
