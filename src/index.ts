// @belongnetwork/platform - Main entry point

// Re-export everything from packages using barrel exports
export * from '../packages/api/src'
export * from '../packages/types/src'
// Note: Core exports are handled explicitly below to avoid duplication

// Named exports for better organization
export * as hooks from '../packages/api/src'
export * as types from '../packages/types/src'

// Explicit core exports to ensure single source of truth
export { 
  createBelongClient,
  createSupabaseClient,
  createMapboxClient,
  createLogger,
  logger,
  logApiCall,
  logApiResponse,
  logComponentRender,
  logEvent,
  logStateChange,
  logUserAction,
  calculateDrivingTime,
  StorageManager
} from '../packages/core/src'