// @belongnetwork/platform - Main entry point

// Re-export everything from packages using barrel exports
export * from '@belongnetwork/api'
export * from '@belongnetwork/types'
export * from '@belongnetwork/core'

// Named exports for better organization
export * as hooks from '@belongnetwork/api'
export * as types from '@belongnetwork/types'
export { BelongClientProvider } from '@belongnetwork/api'

// Explicit global configuration exports for clarity
export { 
  initializeBelong, 
  getBelongClient, 
  isInitialized, 
  resetBelongClient 
} from '@belongnetwork/core'