import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@belongnetwork/types/database";

interface GetApiKeyResponse {
  key: string;
}

interface SetApiKeyResponse {
  success: boolean;
}

export async function getApiKey(
  service: string,
  supabaseClient: SupabaseClient<Database>,
): Promise<string> {
  try {
    const { data: functionData, error: functionError } =
      await supabaseClient.functions.invoke<GetApiKeyResponse>("get-api-key", {
        body: { service },
      });

    if (functionError) throw functionError;
    if (!functionData?.key) throw new Error("API key not found");

    return functionData.key;
  } catch (error) {
    console.error(`Error getting API key for ${service}:`, error);
    throw error;
  }
}

export async function setApiKey(
  service: string,
  key: string,
  supabaseClient: SupabaseClient<Database>,
): Promise<void> {
  try {
    const { data: functionData, error: functionError } =
      await supabaseClient.functions.invoke<SetApiKeyResponse>("set-api-key", {
        body: { service, key },
      });

    if (functionError) throw functionError;
    if (!functionData?.success) throw new Error("Failed to set API key");
  } catch (error) {
    console.error(`Error setting API key for ${service}:`, error);
    throw error;
  }
}
