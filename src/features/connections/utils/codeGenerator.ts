/**
 * Generates a connection code for sharing via URL/QR code
 * Format: 8 uppercase alphanumeric characters
 * Excludes ambiguous characters (0, O, I, 1)
 */
export function generateConnectionCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude 0,1,I,O
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Validates a connection code format
 */
export function isValidConnectionCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  if (code.length !== 8) return false;
  
  // Check only allowed characters
  const validChars = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
  return validChars.test(code);
}

/**
 * Normalizes connection code to uppercase
 */
export function normalizeConnectionCode(code: string): string {
  return code.toUpperCase().trim();
}

/**
 * Formats connection code as URL
 */
export function formatConnectionUrl(code: string, baseUrl = 'https://app.belong.network'): string {
  // Remove trailing slash from baseUrl to avoid double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/connect/${code}`;
}