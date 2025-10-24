import type { UserSummary } from '@/features/users/types';

export interface InvitationCode {
  code: string;
  userId: string;
  communityId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessInvitationResponse {
  success: boolean;
  connectionId?: string;
  message?: string;
  requiresJoinCommunity?: boolean;
  communityId?: string;
  communityName?: string;
}

export interface InvitationDetails {
  user: UserSummary;
  communityId: string;
  isActive: boolean;
  createdAt: Date;
}
