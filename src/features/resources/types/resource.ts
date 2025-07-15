/* eslint-disable no-unused-vars */
import { Coordinates, IsPersisted } from '@/shared';
import { UserSummary } from '../../users';
import { ResourceStatus, ResourceCategory } from './resourceRow';

export type Resource = IsPersisted<ResourceInput & ResourceSummaryFields>;
export type ResourceSummary = IsPersisted<ResourceSummaryFields>;

export type ResourceInput = Omit<ResourceSummaryFields, 'ownerId' | 'owner'> & {
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  communityId: string;
  status?: ResourceStatus;
  maxClaims?: number;
  requiresApproval?: boolean;
  expiresAt?: Date;
};

type ResourceSummaryFields = {
  type: 'offer' | 'request';
  category?: ResourceCategory;
  title: string;
  ownerId: string;
  owner: UserSummary;
  imageUrls?: string[];
  status: ResourceStatus;
  maxClaims?: number;
  requiresApproval: boolean;
  expiresAt?: Date;
};

