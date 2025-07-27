import { Coordinates, IsPersisted } from '@/shared';
import { ResourceStatus, ResourceCategory, ResourceType } from '../index';

// I considered having a ResouceSummary, but nearly everything here is needed on the list view
// However, they are only needed for the VISIBLE items.
// So, the Summary can have just enough to display part of the resource, and then the detail
// display the rest
export type Resource = IsPersisted<ResourceInput> & {
  ownerId: string;
  areTimeslotsFlexible: boolean;
};

export type ResourceSummary = Pick<
  Resource,
  'id' | 'title' | 'status' | 'type'
>;

export enum ResourceTypeEnum {
  OFFER = 'offer',
  REQUEST = 'request',
  EVENT = 'event',
}

export type ClaimLimitPer = 'total' | 'timeslot';

export type ResourceInput = {
  type: ResourceType;
  category?: ResourceCategory;
  title: string;
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  communityIds: string[];
  imageUrls?: string[];
  status: ResourceStatus;
  claimLimit?: number;
  claimLimitPer?: ClaimLimitPer;
  requiresApproval: boolean;
  areTimeslotsFlexible?: boolean;
  expiresAt?: Date;
};
