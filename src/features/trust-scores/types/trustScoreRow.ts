import type { Database } from '@/shared/types/database';

export type TrustScoreRow = Database['public']['Tables']['trust_scores']['Row'];
export type TrustScoreLogRow =
  Database['public']['Tables']['trust_score_logs']['Row'];
