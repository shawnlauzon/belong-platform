/* eslint-disable no-unused-vars */
import { Coordinates, IsPersisted } from '@/shared';
import { UserSummary } from '../../users';

export type Resource = IsPersisted<ResourceInput & ResourceSummaryFields>;
export type ResourceSummary = IsPersisted<ResourceSummaryFields>;

export type ResourceInput = Omit<ResourceSummaryFields, 'ownerId' | 'owner'> & {
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  communityId: string;
};

type ResourceSummaryFields = {
  type: 'offer' | 'request';
  category?: ResourceCategory;
  title: string;
  ownerId: string;
  owner: UserSummary;
  imageUrls?: string[];
};

// Enum needed for database operations
export enum ResourceCategory {
  TOOLS = 'tools',
  SKILLS = 'skills',
  FOOD = 'food',
  SUPPLIES = 'supplies',
  OTHER = 'other',
}
