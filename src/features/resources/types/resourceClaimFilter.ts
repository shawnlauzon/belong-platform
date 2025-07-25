// export type ResourceClaimFilter = {
//   status?: ResourceClaimStatus | ResourceClaimStatus[];
//   resourceId?: string | string[];
//   resourceOwnerId?: string;
//   claimantId?: string;
//   timeslotId?: string;
//   hasShoutout?: boolean;
// };

// Can only query by one of these
export type ResourceClaimFilter = {
  claimantId?: string;
  resourceOwnerId?: string;
};
