import type { Database } from '../../../shared/types/database';

export type ShoutoutRow = Database['public']['Tables']['shoutouts']['Row'];
export type ShoutoutInsertDbData =
  Database['public']['Tables']['shoutouts']['Insert'];
export type ShoutoutUpdateDbData =
  Database['public']['Tables']['shoutouts']['Update'];
