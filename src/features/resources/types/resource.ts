import { Coordinates, IsPersisted } from '@/shared';
import { UserSummary } from '../../users';
import { CommunitySummary } from '../../communities';
import { ResourceStatus, ResourceCategory } from '../index';

export type Resource = IsPersisted<ResourceSummaryFields> & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};
export type ResourceSummary = ResourceSummaryFields & {
  id: string;
};

export type ResourceInput = Omit<ResourceSummaryFields, 'ownerId' | 'owner' | 'communities'> & {
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  communityIds: string[];
  status?: ResourceStatus;
  maxClaims?: number;
  requiresApproval?: boolean;
  expiresAt?: Date;
};

type ResourceSummaryFields = {
  type: 'offer' | 'request';
  category?: ResourceCategory;
  title: string;
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  ownerId: string;
  owner: UserSummary;
  communities: CommunitySummary[];
  imageUrls?: string[];
  status: ResourceStatus;
  maxClaims?: number;
  requiresApproval: boolean;
  expiresAt?: Date;
};
