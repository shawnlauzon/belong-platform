export const MESSAGE_AUTHENTICATION_REQUIRED =
  "User must be authenticated to perform this operation";

export const MESSAGE_NOT_AUTHORIZED =
  "User is not authorized to perform this operation";

export const MESSAGE_NOT_FOUND = "Resource not found";

/**
 * PostgREST/Supabase error codes
 * Reference: https://postgrest.org/en/stable/errors.html
 */
export const ERROR_CODES = {
  /** PostgREST: No rows found */
  NOT_FOUND: "PGRST116",
} as const;
