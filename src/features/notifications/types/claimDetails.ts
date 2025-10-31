import type { ResourceClaimStatus, ResourceType } from '@/features/resources';

/**
 * Detailed claim information included in notification_details view.
 * This provides all the context needed to display claim-related notifications
 * without additional queries.
 */
export interface ClaimDetails {
  resourceId: string;
  timeslotId?: string;
  timeslotStartTime?: Date;
  timeslotEndTime?: Date;
  status: ResourceClaimStatus;
  commitmentLevel?: string;
  resourceTitle: string;
  resourceType: ResourceType;
  claimantName: string;
  ownerName: string;
}
