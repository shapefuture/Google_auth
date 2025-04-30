import { 
  AppError, 
  ErrorCategory, 
  createAuthenticationError,
  createAuthorizationError,
  createValidationError,
  createApiError,
  createDatabaseError,
  createNetworkError,
  withErrorHandling,
  extractResponseInfo,
  handleApiResponse
} from './error-utils';

// Mock the logger
jest.mock('./logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    createScoped: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create an AppError with default category', () => {
      const error = new AppError('Test error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.UNKNOWN);
      expect(error.statusCode).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
    
    it('should create an AppError with custom properties', () => {
      const details = { key: 'value' };
      const error = new AppError('Test error', ErrorCategory.API, 400, details);
      
      expect(error.message).toBe('Test error');
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.statusCode).toBe(400);
      expect(error.details).toBe(details);
    });
    
    it('should capture stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
    });
    
    it('should provide user-friendly messages based on category', () => {
      const authError = new AppError('Auth failed', ErrorCategory.AUTHENTICATION);
      expect(authError.getUserMessage()).toBe('Authentication error. Please sign in again.');
      
      const validationError = new AppError('Invalid input', ErrorCategory.VALIDATION);
      expect(validationError.getUserMessage()).toBe('Invalid input');
      
      const unknownError = new AppError('Something went wrong');
      expect(unknownError.getUserMessage()).toBe('An unexpected error occurred. Please try again later.');
    });
  });
  
  describe('Error factory functions', () => {
    it('should create authentication errors', () => {
      const error = createAuthenticationError('Authentication failed');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
    });
    
    it('should create authorization errors', () => {
      const error = createAuthorizationError('Not authorized');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.statusCode).toBe(403);
    });
    
    it('should create validation errors', () => {
      const error = createValidationError('Invalid input');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.statusCode).toBe(400);
    });
    
    it('should create API errors with custom status code', () => {
      const error = createApiError('API error', 429);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe(ErrorCategory.API);
      expect(error.statusCode).toBe(429);
    });
    
    it('should create database errors', () => {
      const error = createDatabaseError('Database error');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe(ErrorCategory.DATABASE);
      expect(error.statusCode).toBe(500);
    });
    
    it('should create network errors', () => {
      const error = createNetworkError('Network error');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.statusCode).toBe(503);
    });
  });
  
  describe('withErrorHandling', () => {
    it('should handle successful operations', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await withErrorHandling(fn, 'TestModule', 'testMethod');
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
    });
    
    it('should handle AppError instances', async () => {
      const appError = createApiError('API error');
      const fn = jest.fn().mockRejectedValue(appError);
      
      await expect(withErrorHandling(fn, 'TestModule', 'testMethod'))
        .rejects.toThrow(appError);
    });
    
    it('should wrap non-AppError instances', async () => {
      const originalError = new Error('Some error');
      const fn = jest.fn().mockRejectedValue(originalError);
      
      try {
        await withErrorHandling(fn, 'TestModule', 'testMethod');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Some error');
        expect(error.category).toBe(ErrorCategory.UNKNOWN);
      }
    });
    
    it('should use default error message for non-Error rejections', async () => {
      const fn = jest.fn().mockRejectedValue('string error');
      
      try {
        await withErrorHandling(fn, 'TestModule', 'testMethod', 'Custom default message');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Custom default message');
      }
    });
  });
  
  describe('API response handling', () => {
    it('should extract response info', () => {
      const headers = new Headers({
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        'authorization': 'Bearer token',
        'cookie': 'session=123',
      });
      
      const response = {
        status: 200,
        statusText: 'OK',
        url: 'https://api.example.com/test',
        headers: {
          forEach: (callback: (value: string, key: string) => void) => {
            headers.forEach(callback);
          },
        },
      } as Response;
      
      const info = extractResponseInfo(response);
      
      expect(info.status).toBe(200);
      expect(info.statusText).toBe('OK');
      expect(info.url).toBe('https://api.example.com/test');
      expect(info.headers['content-type']).toBe('application/json');
      expect(info.headers['cache-control']).toBe('no-cache');
      expect(info.headers['authorization']).toBeUndefined();
      expect(info.headers['cookie']).toBeUndefined();
    });
    
    describe('handleApiResponse', () => {
      it('should return parsed JSON for successful responses', async () => {
        const mockResponse = {
          ok: true,
          json: jest.fn().mockResolvedValue({ data: 'test' }),
        } as unknown as Response;
        
        const result = await handleApiResponse(mockResponse, 'TestModule', 'testMethod');
        
        expect(result).toEqual({ data: 'test' });
      });
      
      it('should throw ApiError for non-ok responses with valid JSON', async () => {
        const errorData = { message: 'Not found' };
        const mockResponse = {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          url: 'https://api.example.com/test',
          headers: {
            forEach: jest.fn(),
          },
          json: jest.fn().mockResolvedValue(errorData),
        } as unknown as Response;
        
        await expect(handleApiResponse(mockResponse, 'TestModule', 'testMethod'))
          .rejects.toThrow('Not found');
        
        try {
          await handleApiResponse(mockResponse, 'TestModule', 'testMethod');
        } catch (error) {
          expect(error).toBeInstanceOf(AppError);
          expect(error.category).toBe(ErrorCategory.API);
          expect(error.statusCode).toBe(404);
        }
      });
      
      it('should throw ApiError for non-ok responses with invalid JSON', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          url: 'https://api.example.com/test',
          headers: {
            forEach: jest.fn(),
          },
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        } as unknown as Response;
        
        await expect(handleApiResponse(mockResponse, 'TestModule', 'testMethod'))
          .rejects.toThrow('API error: 500 Internal Server Error');
      });
      
      it('should throw ApiError when JSON parsing fails', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          statusText: 'OK',
          url: 'https://api.example.com/test',
          headers: {
            forEach: jest.fn(),
          },
          json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        } as unknown as Response;
        
        await expect(handleApiResponse(mockResponse, 'TestModule', 'testMethod'))
          .rejects.toThrow('Failed to parse API response');
      });
    });
  });
});