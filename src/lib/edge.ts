import { supabase } from './supabase';

interface GetApiKeyResponse {
  key: string;
}

interface SetApiKeyResponse {
  success: boolean;
}

export async function getApiKey(service: string): Promise<string> {
  try {
    const { data: functionData, error: functionError } = await supabase.functions.invoke<GetApiKeyResponse>(
      'get-api-key',
      {
        body: { service },
      }
    );

    if (functionError) throw functionError;
    if (!functionData?.key) throw new Error('API key not found');

    return functionData.key;
  } catch (error) {
    console.error(`Error getting API key for ${service}:`, error);
    throw error;
  }
}

export async function setApiKey(service: string, key: string): Promise<void> {
  try {
    const { data: functionData, error: functionError } = await supabase.functions.invoke<SetApiKeyResponse>(
      'set-api-key',
      {
        body: { service, key },
      }
    );

    if (functionError) throw functionError;
    if (!functionData?.success) throw new Error('Failed to set API key');
  } catch (error) {
    console.error(`Error setting API key for ${service}:`, error);
    throw error;
  }
}