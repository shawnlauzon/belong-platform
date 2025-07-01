import { Database } from '../../../shared';

export type ConversationRow =
  Database['public']['Tables']['conversations']['Row'];
export type ConversationInsertDbData =
  Database['public']['Tables']['conversations']['Insert'];

export type DirectMessageRow =
  Database['public']['Tables']['direct_messages']['Row'];
export type DirectMessageInsertDbData =
  Database['public']['Tables']['direct_messages']['Insert'];
