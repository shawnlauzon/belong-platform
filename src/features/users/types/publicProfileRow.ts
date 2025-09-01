/**
 * Database row type for the public_profiles view
 * This view excludes private fields like email and location
 * All fields are nullable because they come from JSONB extraction
 */
export type PublicProfileRow = {
  id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/**
 * Database row type for UserSummary queries from public_profiles
 * Only includes the minimal fields needed
 */
export type PublicProfileSummaryRow = Pick<PublicProfileRow, 'id' | 'first_name' | 'avatar_url'>;