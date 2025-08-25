import type { ConnectionRequestStatus } from './connectionRow';

export interface MemberConnectionCode {
  code: string;
  userId: string;
  communityId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionRequest {
  id: string;
  communityId: string;
  initiatorId: string;
  requesterId: string;
  status: ConnectionRequestStatus;
  createdAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

export interface UserConnection {
  id: string;
  userAId: string;
  userBId: string;
  communityId: string;
  connectionRequestId: string;
  createdAt: Date;
}


export interface ProcessConnectionLinkResponse {
  success: boolean;
  connectionRequestId?: string;
  message?: string;
  requiresJoinCommunity?: boolean;
  communityId?: string;
  communityName?: string;
}

export interface ConnectionSummary {
  totalConnections: number;
  pendingRequests: number;
  recentConnections: UserConnection[];
}