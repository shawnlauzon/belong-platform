import { createContext, useContext } from 'react';
import { BelongClient } from '../../config';

// Client context for dependency injection following architecture pattern
const ClientContext = createContext<BelongClient | undefined>(undefined);

// Hook to access Mapbox client
export const useMapbox = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useMapbox must be used within BelongProvider');
  }
  return context.mapbox;
};
