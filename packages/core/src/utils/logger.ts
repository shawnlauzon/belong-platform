import log from 'loglevel';

// Configure log level based on environment
const isDevelopment = import.meta.env.DEV;
const logLevel = import.meta.env.VITE_LOG_LEVEL || (isDevelopment ? 'trace' : 'info');

// Set the log level
log.setLevel(logLevel as log.LogLevelDesc);

// Custom log formatter for better readability
const originalFactory = log.methodFactory;
log.methodFactory = function (methodName, logLevel, loggerName) {
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
log.setLevel(log.getLevel());

// Export configured logger
export const logger = log;

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