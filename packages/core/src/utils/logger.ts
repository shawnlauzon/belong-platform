import log from 'loglevel';

/**
 * Creates a configured logger instance
 * @param logLevel - Log level (default: 'info')
 * @returns Configured logger instance
 */
export function createLogger(logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent' = 'info') {
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
      const emoji = {
        trace: '🔍',
        debug: '🐛',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[methodName] || '';
      
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
const defaultLogLevel = import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? 'trace' : 'info');

export const logger = createLogger(defaultLogLevel as any);

// Export convenience methods
export const logComponentRender = (componentName: string, props?: any) => {
  logger.trace(`🎨 Rendering ${componentName}`, props ? { props } : '');
};

export const logApiCall = (method: string, url: string, data?: any) => {
  logger.debug(`🌐 API ${method.toUpperCase()} ${url}`, data ? { data } : '');
};

export const logApiResponse = (method: string, url: string, response?: any, error?: any) => {
  if (error) {
    logger.warn(`🌐 API ${method.toUpperCase()} ${url} failed`, { error });
  } else {
    logger.debug(`🌐 API ${method.toUpperCase()} ${url} success`, response ? { response } : '');
  }
};

export const logUserAction = (action: string, data?: any) => {
  logger.info(`👤 User action: ${action}`, data ? { data } : '');
};

export const logStateChange = (stateName: string, oldValue?: any, newValue?: any) => {
  logger.debug(`🔄 State change: ${stateName}`, { oldValue, newValue });
};

export const logEvent = (eventType: string, eventData?: any) => {
  logger.debug(`📡 Event: ${eventType}`, eventData ? { eventData } : '');
};

export default logger;