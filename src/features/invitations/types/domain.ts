import type { UserSummary } from '@/features/users/types';

export interface InvitationCode {
  code: string;
  userId: string;
  communityId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserConnection {
  id: string;
  userId: string;
  otherId: string;
  communityId: string;
  type: 'invited_by';
  createdAt: Date;
}

export interface ProcessInvitationResponse {
  success: boolean;
  connectionId?: string;
  message?: string;
  requiresJoinCommunity?: boolean;
  communityId?: string;
  communityName?: string;
}

export interface ConnectionSummary {
  totalConnections: number;
  recentConnections: UserConnection[];
}

export interface InvitationDetails {
  user: UserSummary;
  communityId: string;
  isActive: boolean;
  createdAt: Date;
}
