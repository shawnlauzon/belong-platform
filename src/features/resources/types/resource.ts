import { Coordinates, IsPersisted } from '@/shared';
import {
  ResourceStatus,
  ResourceCategory,
  ResourceType,
  ResourceTimeslot,
} from '../index';

// I considered having a ResouceSummary, but nearly everything here is needed on the list view
// However, they are only needed for the VISIBLE items.
// So, the Summary can have just enough to display part of the resource, and then the detail
// display the rest
export type Resource = IsPersisted<ResourceInput> & {
  ownerId: string;
  areTimeslotsFlexible: boolean;
  timeslots: ResourceTimeslot[];
  lastRenewedAt: Date;
  expiresAt?: Date;
  votingDeadline?: Date;
  durationMinutes?: number;
  commentCount: number;
};

export type ResourceSummary = Pick<
  Resource,
  'id' | 'title' | 'status' | 'type' | 'category' | 'ownerId' | 'communityIds' | 'expiresAt'
> & {
  commentCount: number;
};

export enum ResourceTypeEnum {
  OFFER = 'offer',
  REQUEST = 'request',
  EVENT = 'event',
}

export type ClaimLimitPer = 'total' | 'timeslot';

export type ImageCropData = {
  x: number;      // Left edge position (0-1, percentage of original)
  y: number;      // Top edge position (0-1, percentage of original)
  width: number;  // Crop width (0-1, percentage of original)
  height: number; // Crop height (0-1, percentage of original)
};

export type ResourceInput = {
  type: ResourceType;
  category?: ResourceCategory;
  title: string;
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  communityIds: string[];
  imageUrls?: string[];
  imageCropData?: Array<ImageCropData | null>;
  status: ResourceStatus;
  claimLimit?: number;
  claimLimitPer?: ClaimLimitPer;
  requiresApproval: boolean;
  areTimeslotsFlexible?: boolean;
  isRecurring?: boolean;
  lastRenewedAt?: Date;
  votingDeadline?: Date;
  durationMinutes?: number;
};
