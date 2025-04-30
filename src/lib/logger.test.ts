import { logger, createRequestContext, generateRequestId } from './logger';

// Spy on console methods
const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

describe('logger utility', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Restore console methods
    consoleDebugSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('basic logging functions', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message');
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DEBUG] Test debug message',
        ''
      );
    });

    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] Test info message',
        ''
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WARN] Test warning message',
        '',
        ''
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Test error message',
        '',
        ''
      );
    });

    it('should log error messages with error objects', () => {
      const error = new Error('Test error');
      logger.error('Test error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] Test error message',
        '',
        error.stack
      );
    });
  });

  describe('metadata and data handling', () => {
    it('should include module and method in log messages', () => {
      logger.info('Test with metadata', { module: 'TestModule', method: 'testMethod' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] [module=TestModule, method=testMethod] Test with metadata',
        ''
      );
    });

    it('should format data objects in log messages', () => {
      const testData = { key: 'value', number: 123 };
      logger.info('Test with data', { data: testData });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] Test with data',
        JSON.stringify(testData)
      );
    });

    it('should mask sensitive data in logs', () => {
      const sensitiveData = { 
        username: 'testuser', 
        accessToken: 'secret-token',
        refreshToken: 'refresh-secret',
        password: 'password123'
      };
      
      logger.info('Test with sensitive data', { data: sensitiveData });
      
      const loggedData = JSON.parse(consoleLogSpy.mock.calls[0][1]);
      expect(loggedData.accessToken).toBe('[REDACTED]');
      expect(loggedData.refreshToken).toBe('[REDACTED]');
      expect(loggedData.password).toBe('[REDACTED]');
      expect(loggedData.username).toBe('testuser');
    });
  });

  describe('scoped logger', () => {
    it('should create a scoped logger with module name automatically included', () => {
      const scopedLogger = logger.createScoped('TestModule');
      scopedLogger.info('Test scoped logger');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] [module=TestModule] Test scoped logger',
        ''
      );
    });

    it('should allow adding method to scoped logger calls', () => {
      const scopedLogger = logger.createScoped('TestModule');
      scopedLogger.info('Test scoped logger with method', { method: 'testMethod' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] [module=TestModule, method=testMethod] Test scoped logger with method',
        ''
      );
    });

    it('should preserve all logging methods in scoped logger', () => {
      const scopedLogger = logger.createScoped('TestModule');
      
      scopedLogger.debug('Debug message');
      expect(consoleDebugSpy).toHaveBeenCalled();
      
      scopedLogger.warn('Warning message');
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      scopedLogger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('request logging', () => {
    it('should log API request details', () => {
      logger.request('GET', '/api/test', { param: 'value' });
      
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DEBUG] [method=GET] API Request: GET /api/test',
        JSON.stringify({ param: 'value' })
      );
    });

    it('should log API response details', () => {
      logger.response('GET', '/api/test', 200, { result: 'success' });
      
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[DEBUG] [method=GET] API Response: GET /api/test - Status: 200',
        JSON.stringify({ result: 'success' })
      );
    });

    it('should log error responses with error level', () => {
      logger.response('GET', '/api/test', 500, { error: 'Internal server error' });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] [method=GET] API Response: GET /api/test - Status: 500',
        JSON.stringify({ error: 'Internal server error' }),
        ''
      );
    });
  });

  describe('request context', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should create request context with requestId, userId, and projectId', () => {
      const context = createRequestContext('user123', 'project456');
      
      expect(context.requestId).toBeTruthy();
      expect(context.userId).toBe('user123');
      expect(context.projectId).toBe('project456');
      expect(context.logger).toBeDefined();
    });

    it('should include context information in log messages', () => {
      const context = createRequestContext('user123', 'project456');
      context.logger.info('Test context logger');
      
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('[INFO]');
      expect(logCall).toContain('requestId=');
      expect(logCall).toContain('userId=user123');
      expect(logCall).toContain('projectId=project456');
      expect(logCall).toContain('Test context logger');
    });
  });
});