import log from "loglevel";

/**
 * Creates a configured logger instance with enhanced formatting and emoji indicators.
 * 
 * This function creates a logger with timestamp formatting, emoji prefixes for different
 * log levels, and configurable verbosity. Used throughout the Belong Network platform
 * for consistent logging and debugging.
 * 
 * @param logLevel - The minimum log level to display (default: 'info')
 * @returns Configured logger instance with enhanced formatting
 * 
 * @example
 * ```typescript
 * import { createLogger } from '@belongnetwork/core';
 * 
 * const logger = createLogger('debug');
 * 
 * logger.info('Application started'); // ℹ️ [timestamp] INFO  Application started
 * logger.warn('Deprecated API used'); // ⚠️ [timestamp] WARN  Deprecated API used
 * logger.error('Connection failed'); // ❌ [timestamp] ERROR Connection failed
 * ```
 * 
 * @example
 * ```typescript
 * // Production logger with minimal output
 * const productionLogger = createLogger('error');
 * 
 * // Development logger with full verbosity
 * const devLogger = createLogger('trace');
 * 
 * // Custom logger for specific module
 * const apiLogger = createLogger('info');
 * apiLogger.info('🌐 API: Request completed', { 
 *   endpoint: '/api/communities',
 *   duration: 245 
 * });
 * ```
 * 
 * @category Utilities
 */
export function createLogger(
  logLevel: "trace" | "debug" | "info" | "warn" | "error" | "silent" = "info",
) {
  // Create a new logger instance
  const logger = log.getLogger(`belong-${Date.now()}`);

  // Set the log level
  logger.setLevel(logLevel as log.LogLevelDesc);

  // Custom log formatter for better readability
  const originalFactory = logger.methodFactory;
  logger.methodFactory = function (methodName, logLevel, loggerName) {
    const rawMethod = originalFactory(methodName, logLevel, loggerName);

    return function (message, ...args) {
      const timestamp = new Date().toISOString();
      const level = methodName.toUpperCase().padEnd(5);
      const prefix = `[${timestamp}] ${level}`;

      // Add emoji prefixes for better visual distinction
      const emoji =
        {
          trace: "🔍",
          debug: "🐛",
          info: "ℹ️",
          warn: "⚠️",
          error: "❌",
        }[methodName] || "";

      rawMethod(`${emoji} ${prefix}`, message, ...args);
    };
  };

  // Apply the custom formatter
  logger.setLevel(logger.getLevel());

  return logger;
}

// Legacy singleton instance for backward compatibility
// Configure log level based on environment
const isDevelopment = import.meta.env.DEV;
const defaultLogLevel =
  import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? "trace" : "info");

export const logger = createLogger(
  defaultLogLevel as "trace" | "debug" | "info" | "warn" | "error" | "silent",
);

// Export convenience methods
export const logComponentRender = (
  componentName: string,
  props?: Record<string, unknown>,
) => {
  logger.trace(`🎨 Rendering ${componentName}`, props ? { props } : "");
};

export const logApiCall = (method: string, url: string, data?: unknown) => {
  logger.debug(`🌐 API ${method.toUpperCase()} ${url}`, data ? { data } : "");
};

export const logApiResponse = (
  method: string,
  url: string,
  response?: unknown,
  error?: unknown,
) => {
  if (error) {
    logger.warn(`🌐 API ${method.toUpperCase()} ${url} failed`, { error });
  } else {
    logger.debug(
      `🌐 API ${method.toUpperCase()} ${url} success`,
      response ? { response } : "",
    );
  }
};

export const logUserAction = (action: string, data?: unknown) => {
  logger.info(`👤 User action: ${action}`, data ? { data } : "");
};

export const logStateChange = (
  stateName: string,
  oldValue?: unknown,
  newValue?: unknown,
) => {
  logger.debug(`🔄 State change: ${stateName}`, { oldValue, newValue });
};

export const logEvent = (eventType: string, eventData?: unknown) => {
  logger.debug(`📡 Event: ${eventType}`, eventData ? { eventData } : "");
};

export default logger;
