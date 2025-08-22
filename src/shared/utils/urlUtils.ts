/**
 * Regular expression to detect URLs in text
 * Matches http://, https://, and www. URLs
 */
const URL_REGEX = /(\b(https?:\/\/|www\.)[^\s<]+)/gi;

/**
 * Represents a segment of text that may contain a URL
 */
export type TextSegment = {
  text: string;
  isUrl: boolean;
  url?: string;
};

/**
 * Detects URLs in text and returns an array of text segments
 * This allows UI components to render URLs as clickable links
 * 
 * @param text The text to parse for URLs
 * @returns Array of text segments with URL information
 */
export function detectUrls(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match;

  // Create a new regex instance for each call to avoid state issues
  const regex = new RegExp(URL_REGEX);

  while ((match = regex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, match.index),
        isUrl: false,
      });
    }

    // Add the URL
    const urlText = match[0];
    let url = urlText;

    // Ensure URL has a protocol
    if (urlText.startsWith('www.')) {
      url = `https://${urlText}`;
    }

    segments.push({
      text: urlText,
      isUrl: true,
      url,
    });

    lastIndex = match.index + urlText.length;
  }

  // Add any remaining text after the last URL
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isUrl: false,
    });
  }

  // If no URLs were found, return the original text as a single segment
  if (segments.length === 0) {
    segments.push({
      text,
      isUrl: false,
    });
  }

  return segments;
}

/**
 * Converts plain text with URLs to text with clickable links
 * This is a simpler alternative when you just need the HTML
 * 
 * @param text The text to process
 * @returns HTML string with anchor tags for URLs
 */
export function linkifyText(text: string): string {
  if (!text) return '';

  return text.replace(URL_REGEX, (match) => {
    let url = match;
    if (match.startsWith('www.')) {
      url = `https://${match}`;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });
}