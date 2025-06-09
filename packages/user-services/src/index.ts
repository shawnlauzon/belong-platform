import { initializeUserEventHandlers } from './events/userEvents';
import { logger } from '@belongnetwork/core/utils/logger';

// Initialize all user service event handlers
logger.info('🚀 UserServices: Initializing user services package');
initializeUserEventHandlers();
logger.info('✅ UserServices: User services package initialized');

// Export all public APIs
export * from './hooks';
export * from './events';
export * from './services/AuthManager';
export * from './services/ProfileManager';
export * from './services/LocationManager';