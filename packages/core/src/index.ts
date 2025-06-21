// Client Configuration (Primary API)
export {
  createBelongClient,
  type BelongClient,
  type BelongClientConfig,
} from './config/client';


// Factory Functions
export { createSupabaseClient } from './config/supabase';
export { createMapboxClient, type Coordinates } from './config/mapbox';
export { createLogger } from './utils/logger';

// Logger Utilities
export {
  logger,
  logApiCall,
  logApiResponse,
  logComponentRender,
  logEvent,
  logStateChange,
  logUserAction,
} from './utils/logger';

// Utils
export { calculateDrivingTime } from './utils/distance';
export { StorageManager, type UploadResult } from './utils/storage';
