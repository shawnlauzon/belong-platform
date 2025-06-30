import { logger } from "../utils/logger";
import type { createMapboxClient } from "../config/mapbox";

// Helper function to validate coordinates
const isValidCoordinate = (value: number): boolean => {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
};

/**
 * Calculates driving time between two geographic coordinates using Mapbox Directions API.
 * 
 * This function provides accurate driving time estimates by calling the Mapbox Directions API.
 * Includes automatic fallback to mathematical approximation if the API is unavailable,
 * coordinate validation, and comprehensive error handling.
 * 
 * @param origin - Starting location coordinates
 * @param destination - Ending location coordinates  
 * @param mapboxClient - Optional Mapbox client for API calls (uses approximation if not provided)
 * @returns Driving time in minutes
 * 
 * @example
 * ```typescript
 * import { calculateDrivingTime, createMapboxClient } from '@belongnetwork/core';
 * 
 * const mapbox = createMapboxClient('your-token');
 * 
 * const drivingTime = await calculateDrivingTime(
 *   { lat: 37.7749, lng: -122.4194 }, // San Francisco
 *   { lat: 37.3382, lng: -121.8863 }, // San Jose
 *   mapbox
 * );
 * 
 * console.log(`Driving time: ${drivingTime} minutes`);
 * ```
 * 
 * @example
 * ```typescript
 * // Without Mapbox client (uses approximation)
 * const approximateTime = await calculateDrivingTime(
 *   { lat: 40.7128, lng: -74.0060 }, // NYC
 *   { lat: 40.6892, lng: -74.0445 }  // Statue of Liberty
 * );
 * 
 * // Handles invalid coordinates gracefully
 * const safeTime = await calculateDrivingTime(
 *   { lat: NaN, lng: -74.0060 },
 *   { lat: 40.6892, lng: -74.0445 }
 * ); // Returns default fallback time
 * ```
 * 
 * @category Utilities
 */
export const calculateDrivingTime = async (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  mapboxClient?: ReturnType<typeof createMapboxClient>,
): Promise<number> => {
  logger.trace("🗺️ Calculating driving time:", { origin, destination });

  try {
    // Validate all coordinates before making API call
    if (
      !isValidCoordinate(origin.lat) ||
      !isValidCoordinate(origin.lng) ||
      !isValidCoordinate(destination.lat) ||
      !isValidCoordinate(destination.lng)
    ) {
      logger.warn(
        "Invalid coordinates detected, falling back to approximation:",
        {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
        },
      );
      return calculateApproximateDrivingTime(origin, destination);
    }

    if (!mapboxClient) {
      logger.debug("No Mapbox client available, using approximation");
      return calculateApproximateDrivingTime(origin, destination);
    }

    // Use the mapbox client's calculateDrivingTime method
    const drivingTime = await mapboxClient.calculateDrivingTime(
      origin,
      destination,
    );

    if (drivingTime !== null) {
      logger.trace("🗺️ Mapbox driving time calculated:", { drivingTime });
      return drivingTime;
    }

    // Fallback calculation if API fails (direct distance calculation)
    logger.debug("No routes returned from Mapbox, using approximation");
    return calculateApproximateDrivingTime(origin, destination);
  } catch (error) {
    logger.error("Error calculating driving time:", error);
    // Fallback to approximation
    return calculateApproximateDrivingTime(origin, destination);
  }
};

// Fallback method that approximates driving time
const calculateApproximateDrivingTime = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): number => {
  logger.trace("🗺️ Using approximate driving time calculation");

  // Validate coordinates for approximation as well
  if (
    !isValidCoordinate(origin.lat) ||
    !isValidCoordinate(origin.lng) ||
    !isValidCoordinate(destination.lat) ||
    !isValidCoordinate(destination.lng)
  ) {
    logger.warn(
      "Invalid coordinates for approximation, returning default time",
    );
    return 15; // Return a reasonable default time in minutes
  }

  // Simple approximation using Haversine formula with a 1.3x factor for road vs. direct distance
  const R = 6371; // Earth's radius in km
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Assuming average speed of 50 km/h in city driving
  // Multiply by 1.3 to account for road distance vs. direct distance
  const drivingTime = ((distance * 1.3) / 50) * 60;

  const approximateTime = Math.round(drivingTime);
  logger.trace("🗺️ Approximate driving time calculated:", {
    distance,
    approximateTime,
  });

  return approximateTime;
};
