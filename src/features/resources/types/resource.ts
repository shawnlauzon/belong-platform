import { Coordinates, IsPersisted } from '@/shared';
import { ResourceStatus, ResourceCategory, ResourceType } from '../index';

export type Resource = IsPersisted<ResourceInput>;

export enum ResourceTypeEnum {
  OFFER = 'offer',
  REQUEST = 'request',
}

export type ResourceInput = {
  type: ResourceType;
  category?: ResourceCategory;
  title: string;
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  ownerId: string;
  communityIds: string[];
  imageUrls?: string[];
  status: ResourceStatus;
  maxClaims?: number;
  requiresApproval: boolean;
  expiresAt?: Date;
};
