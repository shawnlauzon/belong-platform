import type { Database } from '@/shared/types/database';

export type UserConnectionRow = Database['public']['Tables']['user_connections']['Row'];
export type UserConnectionInsertRow = Database['public']['Tables']['user_connections']['Insert'];
export type UserConnectionUpdateRow = Database['public']['Tables']['user_connections']['Update'];
