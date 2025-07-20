import {
  ResourceClaimStatus,
} from '@/index';
import { IsPersisted } from '@/shared';

export type ResourceClaim = IsPersisted<ResourceClaimInput> & {
  userId: string;
  resourceId: string;
  status: ResourceClaimStatus;
};

// The status of a resource claim
// 1. Pending - Claim owner requests a resource
// 2a. Approved - Resource owner approves the claim
// 2b. Rejected - Resource owner rejects the claim
// 3a. Given - Resource owner provides the resource
// 3b. Received - Claim owner receives the resource
// 4. Completed - When 3a and 3b are both done, automatically completed
// 5. Cancelled - Claim owner cancels the claim

// End states:
// Rejected
// Cancelled
// Completed

// Pending > Approved > Given & Received > Completed
// Pending > Rejected
// Pending | Approved > Cancelled

// Resource status:
// Open - accepts new claims
// Completed - cannot accept new claims
// Cancelled - cannot accept new claims

export type ResourceClaimInput = {
  resourceId: string;
  timeslotId: string;
  status?: ResourceClaimStatus;
  notes?: string;
};
