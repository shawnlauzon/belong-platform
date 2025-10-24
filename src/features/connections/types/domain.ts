export type ConnectionStrength = 'trusted' | 'positive' | 'neutral' | 'negative' | 'unknown';

export interface UserConnection {
  id: string;
  userId: string;
  otherId: string;
  type: 'invited';
  strength: ConnectionStrength | null;
  createdAt: Date;
}

export interface ConnectionSummary {
  totalConnections: number;
  recentConnections: UserConnection[];
}

export interface UpdateConnectionInput {
  otherId: string;
  strength: ConnectionStrength | null;
}
