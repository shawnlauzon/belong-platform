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
export function formatConnectionUrl(
  code: string,
  baseUrl = 'https://app.belongnetwork.co',
): string {
  // Remove trailing slash from baseUrl to avoid double slashes
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/connect/${code}`;
}
