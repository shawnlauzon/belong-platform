import { logger, logApiCall, logApiResponse } from '../utils/logger';
import { Coordinates } from '../types/entities';

// Set your Mapbox token (ideally from environment variable)
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  logger.warn(
    'Mapbox token not found. Please add VITE_MAPBOX_TOKEN to your .env file'
  );
}

type BoundingBox = [number, number, number, number];

type AddressSuggestion = {
  id: string;
  place_name: string;
  center: [number, number];
  bbox?: BoundingBox;
  context?: Array<{ id: string; text: string }>;
};

export const mapbox = {
  /**
   * Search for addresses using Mapbox Geocoding API
   */
  async searchAddresses(query: string): Promise<AddressSuggestion[]> {
    if (!MAPBOX_TOKEN || query.length < 3) {
      return [];
    }

    logApiCall('GET', 'mapbox/geocoding', { query });

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
          `access_token=${MAPBOX_TOKEN}&` +
          `country=US&` +
          `types=address,poi&` +
          `limit=5&` +
          `autocomplete=true`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logApiResponse('GET', 'mapbox/geocoding', data);
      return data.features || [];
    } catch (error) {
      logger.error('❌ Mapbox search error:', error);
      logApiResponse('GET', 'mapbox/geocoding', null, error);
      return [];
    }
  },

  /**
   * Reverse geocode coordinates to get an address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<string | null> {
    if (!MAPBOX_TOKEN) {
      logger.warn('📍 reverseGeocode: No Mapbox token available');
      return null;
    }

    logApiCall('GET', 'mapbox/reverse-geocode', { coordinates });

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?` +
          `access_token=${MAPBOX_TOKEN}&` +
          `types=address&` +
          `limit=1`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logApiResponse('GET', 'mapbox/reverse-geocode', data);

      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }

      return null;
    } catch (error) {
      logger.error('❌ Mapbox reverse geocode error:', error);
      logApiResponse('GET', 'mapbox/reverse-geocode', null, error);
      return null;
    }
  },

  /**
   * Generate a static map image URL
   */
  getStaticMapUrl(
    center: Coordinates,
    options: {
      width?: number;
      height?: number;
      zoom?: number;
      marker?: boolean;
      markerColor?: string;
    } = {}
  ): string {
    const {
      width = 800,
      height = 200,
      zoom = 10,
      marker = true,
      markerColor = 'f97316',
    } = options;

    const baseUrl =
      'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static';
    const markerPart = marker
      ? `pin-l+${markerColor}(${center.lng},${center.lat})/`
      : '';
    const centerPart = `${center.lng},${center.lat},${zoom}`;
    const sizePart = `${width}x${height}`;

    return `${baseUrl}/${markerPart}${centerPart}/${sizePart}?access_token=${MAPBOX_TOKEN}`;
  },

  /**
   * Calculate driving time between two points using Mapbox Directions API
   */
  async calculateDrivingTime(
    origin: Coordinates,
    destination: Coordinates
  ): Promise<number | null> {
    if (!MAPBOX_TOKEN) {
      logger.warn('No Mapbox token available for driving time calculation');
      return null;
    }

    logApiCall('GET', 'mapbox/directions', { origin, destination });

    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      logApiResponse('GET', 'mapbox/directions', data);

      if (data.routes && data.routes.length > 0) {
        // Return duration in minutes
        return Math.round(data.routes[0].duration / 60);
      }

      return null;
    } catch (error) {
      logger.error('Error calculating driving time:', error);
      logApiResponse('GET', 'mapbox/directions', null, error);
      return null;
    }
  },
};

export default mapbox;