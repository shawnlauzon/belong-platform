import { eventBus } from '@belongnetwork/core';
import { DEFAULT_LOCATION } from '@belongnetwork/core';
import { Coordinates } from '@belongnetwork/core';
import { logger, logUserAction } from '@belongnetwork/core';

export class LocationManager {
  static async getCurrentLocation(): Promise<Coordinates> {
    logger.debug('📍 LocationManager: Getting current location...');

    try {
      // Try to get the user's location from the browser
      if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };

              logger.info(
                '📍 LocationManager: Got user location from GPS:',
                location
              );
              logUserAction('location_granted', location);

              // Emit location change event
              eventBus.emit('location.updated', location);

              resolve(location);
            },
            (error) => {
              logger.warn(
                '📍 LocationManager: Geolocation permission denied or failed:',
                error
              );
              logUserAction('location_denied', { error: error.message });

              // Fallback to default location if permission denied
              logger.info(
                '📍 LocationManager: Using default location:',
                DEFAULT_LOCATION
              );
              resolve(DEFAULT_LOCATION);
            }
          );
        });
      }

      // Fallback to default location if geolocation not available
      logger.warn(
        '📍 LocationManager: Geolocation not available, using default location'
      );
      return DEFAULT_LOCATION;
    } catch (error) {
      logger.error(
        '❌ LocationManager: Error getting current location:',
        error
      );
      return DEFAULT_LOCATION;
    }
  }

  // Get random location within 8 minutes of driving
  static getRandomNearbyLocation(center: Coordinates): Coordinates {
    logger.trace('📍 LocationManager: Generating random nearby location:', {
      center,
    });

    // Generate a random angle (in radians)
    const angle = Math.random() * 2 * Math.PI;

    // Generate a random distance (0-8 km, assuming ~1km per minute driving)
    // Max distance is 8 minutes driving, which is roughly 8 km at average speeds
    const distance = Math.random() * 8;

    // Convert distance from km to degrees (approximately)
    // 1 degree of latitude is ~111 km, 1 degree of longitude varies with latitude
    const latOffset = (distance / 111) * Math.sin(angle);
    const lngOffset =
      (distance / (111 * Math.cos((center.lat * Math.PI) / 180))) *
      Math.cos(angle);

    const randomLocation = {
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset,
    };

    logger.trace('📍 LocationManager: Generated random location:', {
      randomLocation,
      distance,
    });

    return randomLocation;
  }

  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    logger.trace('📍 LocationManager: Calculating distance between points:', {
      point1,
      point2,
    });

    // Simple haversine formula implementation
    const R = 6371; // Earth's radius in km
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    logger.trace('📍 LocationManager: Distance calculated:', { distance });

    return distance;
  }
}
