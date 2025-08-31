import { ResourceClaimStatus, ResourceTimeslot } from '@/index';
import { IsPersisted } from '@/shared';

export type ResourceClaim = IsPersisted<ResourceClaimInput> & {
  claimantId: string;
  resourceOwnerId: string;
  timeslot: ResourceTimeslot;
  status: ResourceClaimStatus;
};

export type ResourceClaimSummary = Pick<
  ResourceClaim,
  'id' | 'resourceId' | 'timeslotId' | 'claimantId' | 'status'
>;

/**
 * Resource Claim State Transitions
 * 
 * The state machine differs based on resource type:
 * 
 * ## OFFERS (owner giving something to claimant)
 * Initial State:
 * - If requires_approval = true → 'pending'
 * - If requires_approval = false → 'approved'
 * 
 * State Transitions:
 * - pending → approved (only resource owner)
 * - pending → rejected (only resource owner)
 * - approved → given (only resource owner marks as given)
 * - approved → received (only claimant marks as received)
 * - given → completed (only claimant completes, confirming receipt)
 * - received → completed (only owner completes, confirming given)
 * - Any state except rejected/completed → cancelled (only claimant)
 * 
 * ## REQUESTS (owner requesting something from claimant)
 * Initial State:
 * - If requires_approval = true → 'pending'
 * - If requires_approval = false → 'approved'
 * 
 * State Transitions:
 * - pending → approved (only resource owner)
 * - pending → rejected (only resource owner)
 * - approved → given (only claimant marks as given)
 * - approved → received (only resource owner marks as received)
 * - given → completed (only owner completes, confirming receipt)
 * - received → completed (only claimant completes, confirming given)
 * - Any state except rejected/completed → cancelled (only claimant)
 * 
 * ## EVENTS
 * Initial State:
 * - If requires_approval = true → 'pending'
 * - If requires_approval = false → 'interested'
 * 
 * State Transitions:
 * - pending → interested (only event owner approves interest)
 * - pending → rejected (only event owner)
 * - interested → going (only claimant/attendee confirms going)
 * - going → attended (only event owner marks as attended)
 * - going → flaked (only event owner marks as no-show)
 * 
 * Note: Events do NOT use 'cancelled' status
 * 
 * ## Key Rules:
 * - Cannot skip states (e.g., approved cannot go directly to completed)
 * - Both parties must participate in the handshake for offers/requests
 * - All transitions are validated and enforced at the database level
 * - Clear error messages provided for invalid transitions
 */

/**
 * Input for creating a resource claim.
 * Status is determined automatically by the API based on:
 * - Resource type (offer, request, or event)
 * - Whether the resource requires approval
 * 
 * @property resourceId - The ID of the resource being claimed
 * @property timeslotId - The ID of the timeslot being claimed
 * @property notes - Optional notes from the claimant
 */
export type ResourceClaimInput = {
  resourceId: string;
  timeslotId: string;
  notes?: string;
};
