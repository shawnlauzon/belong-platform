import {
  logger as defaultLogger,
  logApiCall,
  logApiResponse,
} from "../utils/logger";

// Types
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Creates a configured Mapbox client instance for geolocation and mapping services.
 * 
 * This function creates a Mapbox client with address search capabilities, coordinate
 * handling, and distance calculations. Includes automatic API call logging and
 * error handling for all Mapbox services used by the Belong Network platform.
 * 
 * @param mapboxPublicToken - Your Mapbox public access token
 * @param logger - Logger instance for API debugging (optional, uses platform default)
 * @returns Configured Mapbox client with search and geocoding methods
 * 
 * @example
 * ```typescript
 * import { createMapboxClient } from '@belongnetwork/core';
 * 
 * const mapbox = createMapboxClient('your-mapbox-token');
 * 
 * // Search for addresses
 * const addresses = await mapbox.searchAddresses('1600 Pennsylvania Avenue');
 * console.log(addresses[0].place_name); // "1600 Pennsylvania Avenue NW, Washington, DC"
 * 
 * // Get coordinates
 * const coords = addresses[0].center; // [lng, lat]
 * ```
 * 
 * @example
 * ```typescript
 * // Integration with React components
 * function LocationPicker() {
 *   const mapbox = createMapboxClient(process.env.REACT_APP_MAPBOX_TOKEN);
 *   const [suggestions, setSuggestions] = useState([]);
 * 
 *   const handleSearch = async (query) => {
 *     const results = await mapbox.searchAddresses(query);
 *     setSuggestions(results);
 *   };
 * 
 *   return (
 *     <input 
 *       onChange={(e) => handleSearch(e.target.value)}
 *       placeholder="Search for location..."
 *     />
 *   );
 * }
 * ```
 * 
 * @category Client Functions
 */
export function createMapboxClient(
  mapboxPublicToken: string,
  logger = defaultLogger,
) {
  if (!mapboxPublicToken) {
    throw new Error("Mapbox public token is required");
  }

  return {
    /**
     * Get the public token
     */
    getPublicToken: () => mapboxPublicToken,

    /**
     * Search for addresses using Mapbox Geocoding API
     */
    async searchAddresses(query: string): Promise<AddressSuggestion[]> {
      if (!mapboxPublicToken || query.length < 3) {
        return [];
      }

      logApiCall("GET", "mapbox/geocoding", { query });

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
            `access_token=${mapboxPublicToken}&` +
            `country=US&` +
            `types=address,poi&` +
            `limit=5&` +
            `autocomplete=true`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logApiResponse("GET", "mapbox/geocoding", data);
        return data.features || [];
      } catch (error) {
        logger.error("❌ Mapbox search error:", error);
        logApiResponse("GET", "mapbox/geocoding", null, error);
        return [];
      }
    },

    /**
     * Reverse geocode coordinates to get an address
     */
    async reverseGeocode(coordinates: Coordinates): Promise<string | null> {
      if (!mapboxPublicToken) {
        logger.warn("📍 reverseGeocode: No Mapbox token available");
        return null;
      }

      logApiCall("GET", "mapbox/reverse-geocode", { coordinates });

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?` +
            `access_token=${mapboxPublicToken}&` +
            `types=address&` +
            `limit=1`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logApiResponse("GET", "mapbox/reverse-geocode", data);

        if (data.features && data.features.length > 0) {
          return data.features[0].place_name;
        }

        return null;
      } catch (error) {
        logger.error("❌ Mapbox reverse geocode error:", error);
        logApiResponse("GET", "mapbox/reverse-geocode", null, error);
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
      } = {},
    ): string {
      const {
        width = 800,
        height = 200,
        zoom = 10,
        marker = true,
        markerColor = "f97316",
      } = options;

      const baseUrl =
        "https://api.mapbox.com/styles/v1/mapbox/streets-v11/static";
      const markerPart = marker
        ? `pin-l+${markerColor}(${center.lng},${center.lat})/`
        : "";
      const centerPart = `${center.lng},${center.lat},${zoom}`;
      const sizePart = `${width}x${height}`;

      return `${baseUrl}/${markerPart}${centerPart}/${sizePart}?access_token=${mapboxPublicToken}`;
    },

    /**
     * Calculate driving time between two points using Mapbox Directions API
     */
    async calculateDrivingTime(
      origin: Coordinates,
      destination: Coordinates,
    ): Promise<number | null> {
      if (!mapboxPublicToken) {
        logger.warn("No Mapbox token available for driving time calculation");
        return null;
      }

      logApiCall("GET", "mapbox/directions", { origin, destination });

      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${mapboxPublicToken}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logApiResponse("GET", "mapbox/directions", data);

        if (data.routes && data.routes.length > 0) {
          // Return duration in minutes
          return Math.round(data.routes[0].duration / 60);
        }

        return null;
      } catch (error) {
        logger.error("Error calculating driving time:", error);
        logApiResponse("GET", "mapbox/directions", null, error);
        return null;
      }
    },
  };
}

type BoundingBox = [number, number, number, number];

type AddressSuggestion = {
  id: string;
  place_name: string;
  center: [number, number];
  bbox?: BoundingBox;
  context?: Array<{ id: string; text: string }>;
};
