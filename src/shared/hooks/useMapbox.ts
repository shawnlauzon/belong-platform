import { useContext } from 'react';
import { ClientContext } from '../../config';

// Hook to access Mapbox client
export const useMapbox = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useMapbox must be used within BelongProvider');
  }
  if (!context.mapbox) {
    throw new Error('Mapbox client is not available. Please provide a mapboxPublicToken in BelongProvider config.');
  }
  return context.mapbox;
};
