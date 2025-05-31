import { eventBus } from '@/core/eventBus';
import { DEFAULT_LOCATION } from '@/lib/mapbox';
import { Coordinates } from '@/types';

export class LocationManager {
  static async getCurrentLocation(): Promise<Coordinates> {
    try {
      // Try to get the user's location from the browser
      if (navigator.geolocation) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              
              // Emit location change event
              eventBus.emit('location.updated', location);
              
              resolve(location);
            },
            () => {
              // Fallback to default location if permission denied
              resolve(DEFAULT_LOCATION);
            }
          );
        });
      }
      
      // Fallback to default location if geolocation not available
      return DEFAULT_LOCATION;
    } catch (error) {
      console.error('Error getting current location:', error);
      return DEFAULT_LOCATION;
    }
  }
  
  // Get random location within 8 minutes of driving
  static getRandomNearbyLocation(center: Coordinates): Coordinates {
    // Generate a random angle (in radians)
    const angle = Math.random() * 2 * Math.PI;
    
    // Generate a random distance (0-8 km, assuming ~1km per minute driving)
    // Max distance is 8 minutes driving, which is roughly 8 km at average speeds
    const distance = Math.random() * 8;
    
    // Convert distance from km to degrees (approximately)
    // 1 degree of latitude is ~111 km, 1 degree of longitude varies with latitude
    const latOffset = (distance / 111) * Math.sin(angle);
    const lngOffset = (distance / (111 * Math.cos(center.lat * Math.PI / 180))) * Math.cos(angle);
    
    return {
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset
    };
  }
  
  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    // Simple haversine formula implementation
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}