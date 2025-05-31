import mapboxgl from 'mapbox-gl';

// Set your Mapbox token (ideally from environment variable)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.warn('Mapbox token not found. Please add VITE_MAPBOX_TOKEN to your .env file');
}

mapboxgl.accessToken = MAPBOX_TOKEN || '';

// Default location (Austin, TX)
export const DEFAULT_LOCATION = {
  lat: parseFloat(import.meta.env.VITE_DEFAULT_LOCATION_LAT || '30.2672'),
  lng: parseFloat(import.meta.env.VITE_DEFAULT_LOCATION_LNG || '-97.7431')
};

// Calculate driving time between two points (using Mapbox Directions API)
export const calculateDrivingTime = async (
  origin: { lat: number; lng: number }, 
  destination: { lat: number; lng: number }
): Promise<number> => {
  try {
    if (!MAPBOX_TOKEN) {
      // Fallback to approximation if no token
      return calculateApproximateDrivingTime(origin, destination);
    }

    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${MAPBOX_TOKEN}`
    );
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return driving time in minutes
    if (data.routes && data.routes.length > 0) {
      return Math.round(data.routes[0].duration / 60);
    }
    
    // Fallback calculation if API fails (direct distance calculation)
    return calculateApproximateDrivingTime(origin, destination);
  } catch (error) {
    console.error('Error calculating driving time:', error);
    // Fallback to approximation
    return calculateApproximateDrivingTime(origin, destination);
  }
};

// Fallback method that approximates driving time
const calculateApproximateDrivingTime = (
  origin: { lat: number; lng: number }, 
  destination: { lat: number; lng: number }
): number => {
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
  
  return Math.round(drivingTime);
};