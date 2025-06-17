// @belongnetwork/platform - Main entry point

// Re-export everything from packages using barrel exports
export * from '../packages/api/src'
export * from '../packages/types/src'

// Named exports for better organization
export * as hooks from '../packages/api/src'
export * as types from '../packages/types/src'
export { BelongClientProvider } from '../packages/api/src'