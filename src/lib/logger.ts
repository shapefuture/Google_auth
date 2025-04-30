/**
 * Central logging utility for the Gemini Gateway application
 * Provides consistent logging across the application with configurable log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  module?: string;
  method?: string;
  data?: any;
  stack?: string;
  userId?: string;
  projectId?: string;
  requestId?: string;
}

// Get log level from environment or default to 'info'
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;

// Map log levels to numeric values for comparison
const LOG_LEVEL_MAP: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Should this level be logged based on configured LOG_LEVEL?
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_MAP[level] >= LOG_LEVEL_MAP[LOG_LEVEL];
}

// Format data for logging
function formatData(data: any): string {
  if (data === undefined || data === null) return '';
  
  try {
    if (typeof data === 'object') {
      // Handle sensitive data
      const safeData = { ...data };
      
      // Mask sensitive fields
      if (safeData.accessToken) safeData.accessToken = '[REDACTED]';
      if (safeData.refreshToken) safeData.refreshToken = '[REDACTED]';
      if (safeData.password) safeData.password = '[REDACTED]';
      
      return JSON.stringify(safeData);
    }
    return String(data);
  } catch (error) {
    return '[Unserializable data]';
  }
}

// Create log metadata string
function createMetadata(options?: LogOptions): string {
  if (!options) return '';
  
  const parts: string[] = [];
  
  if (options.module) parts.push(`module=${options.module}`);
  if (options.method) parts.push(`method=${options.method}`);
  if (options.userId) parts.push(`userId=${options.userId}`);
  if (options.projectId) parts.push(`projectId=${options.projectId}`);
  if (options.requestId) parts.push(`requestId=${options.requestId}`);
  
  return parts.length ? `[${parts.join(', ')}]` : '';
}

// Logger interface
export const logger = {
  debug(message: string, options?: LogOptions) {
    if (!shouldLog('debug')) return;
    
    const metadata = createMetadata(options);
    console.debug(
      `[DEBUG]${metadata ? ' ' + metadata : ''} ${message}`,
      options?.data ? formatData(options.data) : ''
    );
  },
  
  info(message: string, options?: LogOptions) {
    if (!shouldLog('info')) return;
    
    const metadata = createMetadata(options);
    console.log(
      `[INFO]${metadata ? ' ' + metadata : ''} ${message}`,
      options?.data ? formatData(options.data) : ''
    );
  },
  
  warn(message: string, options?: LogOptions) {
    if (!shouldLog('warn')) return;
    
    const metadata = createMetadata(options);
    console.warn(
      `[WARN]${metadata ? ' ' + metadata : ''} ${message}`,
      options?.data ? formatData(options.data) : '',
      options?.stack ? `\nStack: ${options.stack}` : ''
    );
  },
  
  error(message: string, error?: Error | unknown, options?: LogOptions) {
    if (!shouldLog('error')) return;
    
    const err = error as Error;
    const metadata = createMetadata(options);
    
    console.error(
      `[ERROR]${metadata ? ' ' + metadata : ''} ${message}`,
      options?.data ? formatData(options.data) : '',
      err?.stack || options?.stack || ''
    );
  },
  
  // Convenience method for API request logging
  request(method: string, url: string, data?: any, options?: LogOptions) {
    if (!shouldLog('debug')) return;
    
    this.debug(`API Request: ${method} ${url}`, {
      ...options,
      method,
      data,
    });
  },
  
  // Convenience method for API response logging
  response(method: string, url: string, status: number, data?: any, options?: LogOptions) {
    const logMethod = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
    
    if (!shouldLog(logMethod as LogLevel)) return;
    
    this[logMethod as 'debug' | 'error' | 'warn'](
      `API Response: ${method} ${url} - Status: ${status}`,
      { ...options, method, data }
    );
  },
  
  // Create a scoped logger for a specific module
  createScoped(module: string) {
    return {
      debug: (message: string, options?: Omit<LogOptions, 'module'>) => 
        logger.debug(message, { ...options, module }),
      info: (message: string, options?: Omit<LogOptions, 'module'>) => 
        logger.info(message, { ...options, module }),
      warn: (message: string, options?: Omit<LogOptions, 'module'>) => 
        logger.warn(message, { ...options, module }),
      error: (message: string, error?: Error | unknown, options?: Omit<LogOptions, 'module'>) => 
        logger.error(message, error, { ...options, module }),
      request: (method: string, url: string, data?: any, options?: Omit<LogOptions, 'module'>) => 
        logger.request(method, url, data, { ...options, module }),
      response: (method: string, url: string, status: number, data?: any, options?: Omit<LogOptions, 'module'>) => 
        logger.response(method, url, status, data, { ...options, module }),
    };
  }
};

// Generate a unique request ID for tracking requests through the system
export function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
}

// Create traceable context for a request
export function createRequestContext(userId?: string, projectId?: string) {
  const requestId = generateRequestId();
  
  return {
    requestId,
    userId,
    projectId,
    logger: {
      debug: (message: string, options?: Omit<LogOptions, 'requestId' | 'userId' | 'projectId'>) => 
        logger.debug(message, { ...options, requestId, userId, projectId }),
      info: (message: string, options?: Omit<LogOptions, 'requestId' | 'userId' | 'projectId'>) => 
        logger.info(message, { ...options, requestId, userId, projectId }),
      warn: (message: string, options?: Omit<LogOptions, 'requestId' | 'userId' | 'projectId'>) => 
        logger.warn(message, { ...options, requestId, userId, projectId }),
      error: (message: string, error?: Error | unknown, options?: Omit<LogOptions, 'requestId' | 'userId' | 'projectId'>) => 
        logger.error(message, error, { ...options, requestId, userId, projectId }),
    },
  };
}