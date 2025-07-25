import { ResourceStatus } from '..';

// export type ResourceFilter = {
//   type?: ResourceType;
//   communityId?: string | [string];
//   category?: ResourceCategory | [ResourceCategory];
//   status?: ResourceStatus;
//   ownerId?: string;
//   claimStatus?: ResourceClaimStatus | [ResourceClaimStatus];
//   claimantId?: string;
//   maxDriveMinutes?: number;
//   searchTerm?: string;
//   hasAvailableSlots?: boolean;
// };

export type ResourceFilter = {
  communityId?: string | string[];
  status?: ResourceStatus | ResourceStatus[];
  ownerId?: string;
};
