import { logger } from "@belongnetwork/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";
import { MESSAGE_AUTHENTICATION_REQUIRED } from "../constants";

/**
 * Validates that the current user is authenticated and returns their user ID.
 * 
 * @param supabase - The Supabase client instance
 * @param operation - Optional operation name for better error logging
 * @returns The authenticated user's ID
 * @throws Error with MESSAGE_AUTHENTICATION_REQUIRED if authentication fails
 */
export async function requireAuthentication(
  supabase: SupabaseClient<Database>,
  operation?: string
): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user?.id) {
    const logMessage = operation 
      ? `User must be authenticated to ${operation}`
      : "User must be authenticated to perform this operation";
    
    logger.error(logMessage, {
      error: userError,
      operation,
    });
    
    throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
  }

  return userData.user.id;
}