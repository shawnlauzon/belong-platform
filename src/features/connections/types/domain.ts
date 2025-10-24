export type ConnectionStrength = 'trusted' | 'positive' | 'neutral' | 'negative' | 'unknown';

export interface UserConnection {
  id: string;
  userId: string;
  otherId: string;
  communityId: string;
  type: 'invited_by';
  strength: ConnectionStrength | null;
  createdAt: Date;
}

export interface ConnectionSummary {
  totalConnections: number;
  recentConnections: UserConnection[];
}

export interface UpdateConnectionInput {
  otherId: string;
  communityId: string;
  strength: ConnectionStrength | null;
}
