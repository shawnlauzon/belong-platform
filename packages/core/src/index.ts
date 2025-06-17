// Client Configuration (Primary API)
export { createBelongClient, type BelongClient, type BelongClientConfig } from './config/client';

// Factory Functions
export { createSupabaseClient } from './config/supabase';
export { createMapboxClient, type Coordinates } from './config/mapbox';
export { createLogger } from './utils/logger';

// Legacy Singleton Instances (for backward compatibility)
export { getPublicToken, mapbox } from './config/mapbox';
export { supabase } from './config/supabase';
export { logger, logApiCall, logApiResponse, logComponentRender, logEvent, logStateChange, logUserAction } from './utils/logger';

// Utils
export { calculateDrivingTime } from './utils/distance';
export { StorageManager, type UploadResult } from './utils/storage';

// Types (re-exported from types package)
export * from '@belongnetwork/types';
