export type GatheringFilter = {
  communityId?: string;
  communityIds?: string[];
  organizerId?: string;
  startAfter?: Date;
  startBefore?: Date;
  searchTerm?: string;
  includePast?: boolean;    // default true
  includeCurrent?: boolean; // default true
  includeFuture?: boolean;  // default true
};
