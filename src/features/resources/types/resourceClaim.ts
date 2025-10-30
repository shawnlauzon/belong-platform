import { ResourceClaimStatus, ResourceTimeslot, CommitmentLevel } from '@/index';
import { IsPersisted } from '@/shared';

export type ResourceClaim = IsPersisted<ResourceClaimInput> & {
  claimantId: string;
  resourceOwnerId: string;
  timeslot: ResourceTimeslot;
  status: ResourceClaimStatus;
  commitmentLevel: CommitmentLevel;
  requestText?: string;
  responseText?: string;
};

export type ResourceClaimSummary = Pick<
  ResourceClaim,
  'id' | 'resourceId' | 'timeslotId' | 'claimantId' | 'status'
>;

/**
 * Resource Claim State Transitions
 *
 * The state machine differs based on resource type and status:
 *
 * ## VOTING EVENTS (status='voting')
 * Initial State:
 * - 'vote' (when claiming a proposed timeslot during voting phase)
 *
 * State Transitions:
 * - vote → pending (finalization, if requires_approval = true)
 * - vote → going (finalization, if requires_approval = false)
 * - vote → cancelled (claimant cancels their vote)
 *
 * Notes:
 * - Users can create multiple vote claims (one per timeslot)
 * - Votes are converted automatically during finalization
 * - Vote claims do NOT count against claimLimit
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
 * ## EVENTS (status='active')
 * Initial State:
 * - If requires_approval = true → 'pending'
 * - If requires_approval = false → 'approved'
 *
 * State Transitions:
 * - pending → approved (only event owner)
 * - pending → rejected (only event owner)
 * - approved → going (only claimant/attendee confirms going)
 * - going → attended (only event owner marks as attended)
 * - going → flaked (only event owner marks as no-show)
 * - approved|going → cancelled (only claimant)
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
 * @property requestText - Optional message from the claimant when making the claim
 * @property responseText - Optional response from the resource owner
 * @property commitmentLevel - Optional commitment level (defaults to 'interested' for events)
 */
export type ResourceClaimInput = {
  resourceId: string;
  timeslotId: string;
  requestText?: string;
  responseText?: string;
  commitmentLevel?: CommitmentLevel;
};
