import mapboxgl from 'mapbox-gl';
import { logger, logApiCall, logApiResponse } from '@/lib/logger';

// Set your Mapbox token (ideally from environment variable)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  logger.warn('Mapbox token not found. Please add VITE_MAPBOX_TOKEN to your .env file');
}

mapboxgl.accessToken = MAPBOX_TOKEN || '';

// Default location (Austin, TX)
export const DEFAULT_LOCATION = {
  lat: parseFloat(import.meta.env.VITE_DEFAULT_LOCATION_LAT || '30.2672'),
  lng: parseFloat(import.meta.env.VITE_DEFAULT_LOCATION_LNG || '-97.7431')
};

logger.debug('🗺️ Mapbox configuration:', {
  hasToken: !!MAPBOX_TOKEN,
  defaultLocation: DEFAULT_LOCATION
});

// Helper function to validate coordinates
const isValidCoordinate = (value: number): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

// Calculate driving time between two points (using Mapbox Directions API)
export const calculateDrivingTime = async (
  origin: { lat: number; lng: number }, 
  destination: { lat: number; lng: number }
): Promise<number> => {
  logger.trace('🗺️ Calculating driving time:', { origin, destination });
  
  try {
    // Validate all coordinates before making API call
    if (!isValidCoordinate(origin.lat) || !isValidCoordinate(origin.lng) || 
        !isValidCoordinate(destination.lat) || !isValidCoordinate(destination.lng)) {
      logger.warn('Invalid coordinates detected, falling back to approximation:', {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng }
      });
      return calculateApproximateDrivingTime(origin, destination);
    }

    if (!MAPBOX_TOKEN) {
      logger.debug('No Mapbox token available, using approximation');
      return calculateApproximateDrivingTime(origin, destination);
    }

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}`;
    
    logApiCall('GET', 'mapbox/directions', { origin, destination });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.warn(`Mapbox API error: ${response.status}, falling back to approximation`);
      logApiResponse('GET', 'mapbox/directions', null, { status: response.status });
      return calculateApproximateDrivingTime(origin, destination);
    }
    
    const data = await response.json();
    
    // Return driving time in minutes
    if (data.routes && data.routes.length > 0) {
      const drivingTimeMinutes = Math.round(data.routes[0].duration / 60);
      logApiResponse('GET', 'mapbox/directions', { drivingTimeMinutes });
      logger.trace('🗺️ Mapbox driving time calculated:', { drivingTimeMinutes });
      return drivingTimeMinutes;
    }
    
    // Fallback calculation if API fails (direct distance calculation)
    logger.debug('No routes returned from Mapbox, using approximation');
    return calculateApproximateDrivingTime(origin, destination);
  } catch (error) {
    logger.error('Error calculating driving time:', error);
    logApiResponse('GET', 'mapbox/directions', null, error);
    // Fallback to approximation
    return calculateApproximateDrivingTime(origin, destination);
  }
};

// Fallback method that approximates driving time
const calculateApproximateDrivingTime = (
  origin: { lat: number; lng: number }, 
  destination: { lat: number; lng: number }
): number => {
  logger.trace('🗺️ Using approximate driving time calculation');
  
  // Validate coordinates for approximation as well
  if (!isValidCoordinate(origin.lat) || !isValidCoordinate(origin.lng) || 
      !isValidCoordinate(destination.lat) || !isValidCoordinate(destination.lng)) {
    logger.warn('Invalid coordinates for approximation, returning default time');
    return 15; // Return a reasonable default time in minutes
  }

  // Simple approximation using Haversine formula with a 1.3x factor for road vs. direct distance
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLon = (destination.lng - origin.lng) * Math.PI / 180;
  const lat1 = origin.lat * Math.PI / 180;
  const lat2 = destination.lat * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  
  // Assuming average speed of 50 km/h in city driving
  // Multiply by 1.3 to account for road distance vs. direct distance
  const drivingTime = (distance * 1.3) / 50 * 60;
  
  const approximateTime = Math.round(drivingTime);
  logger.trace('🗺️ Approximate driving time calculated:', { distance, approximateTime });
  
  return approximateTime;
};