import type { Database } from '@/shared/types/database';

export type InvitationCodeRow = Database['public']['Tables']['invitation_codes']['Row'];
export type InvitationCodeInsertRow = Database['public']['Tables']['invitation_codes']['Insert'];
export type InvitationCodeUpdateRow = Database['public']['Tables']['invitation_codes']['Update'];

export type UserConnectionRow = Database['public']['Tables']['user_connections']['Row'];
export type UserConnectionInsertRow = Database['public']['Tables']['user_connections']['Insert'];
export type UserConnectionUpdateRow = Database['public']['Tables']['user_connections']['Update'];