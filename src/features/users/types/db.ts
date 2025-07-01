import { Database } from '../../../types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsertDbData =
  Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdateDbData =
  Database['public']['Tables']['profiles']['Update'];
