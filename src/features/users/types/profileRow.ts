import type { Database } from '@/shared/types/database';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsertRow =
  Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdateRow =
  Database['public']['Tables']['profiles']['Update'];
