import mapboxgl from 'mapbox-gl';
import { logger } from '../utils/logger';

// Set your Mapbox token (ideally from environment variable)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  logger.warn(
    'Mapbox token not found. Please add VITE_MAPBOX_TOKEN to your .env file'
  );
}

mapboxgl.accessToken = MAPBOX_TOKEN || '';

// Default location (Austin, TX)
export const DEFAULT_LOCATION = {
  lat: parseFloat(import.meta.env.VITE_DEFAULT_LOCATION_LAT || '30.2672'),
  lng: parseFloat(import.meta.env.VITE_DEFAULT_LOCATION_LNG || '-97.7431'),
};

logger.debug('🗺️ Mapbox configuration:', {
  hasToken: !!MAPBOX_TOKEN,
  defaultLocation: DEFAULT_LOCATION,
});
