import { isTokenExpired, refreshAccessToken, getValidAccessToken, storeTokenData, getTokenData, clearTokenData } from './token-utils';
import { AppError, ErrorCategory } from './error-utils';

// Mock the modules we need
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn().mockImplementation((name) => {
      if (name === 'token-validuser') {
        return { value: 'encrypted-token-data' };
      }
      return undefined;
    }),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('jose', () => ({
  EncryptJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    encrypt: jest.fn().mockResolvedValue('encrypted-token-data'),
  })),
  jwtDecrypt: jest.fn().mockImplementation((token) => {
    if (token === 'encrypted-token-data') {
      return Promise.resolve({
        payload: {
          accessToken: 'valid-access-token',
          refreshToken: 'valid-refresh-token',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
        },
      });
    }
    throw new Error('Invalid token');
  }),
}));

// Mock fetch for token refresh
global.fetch = jest.fn().mockImplementation((url) => {
  if (url === 'https://oauth2.googleapis.com/token') {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'new-access-token',
        expires_in: 3600,
        scope: 'email https://www.googleapis.com/auth/generative-language openid',
        token_type: 'Bearer',
      }),
    });
  }
  return Promise.reject(new Error('Unexpected URL'));
});

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
  };
});
afterEach(() => {
  process.env = originalEnv;
});

// Mock the logger
jest.mock('./logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    request: jest.fn(),
    createScoped: jest.fn().mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      request: jest.fn(),
    }),
  },
}));

describe('Token Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      // Token expired 10 minutes ago
      const expiresAt = Math.floor(Date.now() / 1000) - 600;
      expect(isTokenExpired(expiresAt)).toBe(true);
    });
    
    it('should return true for tokens expiring soon (within buffer)', () => {
      // Token expires in 2 minutes (buffer is 5 minutes)
      const expiresAt = Math.floor(Date.now() / 1000) + 120;
      expect(isTokenExpired(expiresAt)).toBe(true);
    });
    
    it('should return false for valid tokens not expiring soon', () => {
      // Token expires in 10 minutes
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      expect(isTokenExpired(expiresAt)).toBe(false);
    });
  });
  
  describe('storeTokenData', () => {
    it('should encrypt and store token data', async () => {
      const tokenData = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      };
      
      await storeTokenData('user123', tokenData);
      
      // Verify the cookie was set
      const { cookies } = require('next/headers');
      expect(cookies().set).toHaveBeenCalledWith(expect.objectContaining({
        name: 'token-user123',
        value: 'encrypted-token-data',
        httpOnly: true,
      }));
    });
  });
  
  describe('getTokenData', () => {
    it('should retrieve and decrypt token data for valid users', async () => {
      const tokenData = await getTokenData('validuser');
      
      expect(tokenData).toEqual({
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expect.any(Number),
      });
    });
    
    it('should return null for users without tokens', async () => {
      const tokenData = await getTokenData('invaliduser');
      
      expect(tokenData).toBeNull();
    });
  });
  
  describe('refreshAccessToken', () => {
    it('should refresh an access token using the refresh token', async () => {
      const result = await refreshAccessToken('valid-refresh-token');
      
      expect(result).toEqual({
        accessToken: 'new-access-token',
        expiresAt: expect.any(Number),
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.any(String),
        })
      );
    });
    
    it('should throw an error if client credentials are missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      
      await expect(refreshAccessToken('valid-refresh-token'))
        .rejects.toThrow('Google OAuth credentials are missing');
    });
  });
  
  describe('getValidAccessToken', () => {
    it('should return a valid token without refreshing if not expired', async () => {
      const tokenData = {
        accessToken: 'valid-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };
      
      // Mock getTokenData for this test
      jest.spyOn(require('./token-utils'), 'getTokenData')
        .mockResolvedValueOnce(tokenData);
      
      const token = await getValidAccessToken('user123');
      
      expect(token).toBe('valid-access-token');
      expect(global.fetch).not.toHaveBeenCalled(); // No refresh needed
    });
    
    it('should refresh an expired token', async () => {
      const tokenData = {
        accessToken: 'expired-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
      };
      
      // Mock getTokenData for this test
      jest.spyOn(require('./token-utils'), 'getTokenData')
        .mockResolvedValueOnce(tokenData);
      
      const token = await getValidAccessToken('user123');
      
      expect(token).toBe('new-access-token');
      expect(global.fetch).toHaveBeenCalled(); // Token was refreshed
    });
    
    it('should return null if no token data exists', async () => {
      // Mock getTokenData to return null
      jest.spyOn(require('./token-utils'), 'getTokenData')
        .mockResolvedValueOnce(null);
      
      const token = await getValidAccessToken('user123');
      
      expect(token).toBeNull();
    });
    
    it('should return null if no refresh token is available for an expired token', async () => {
      const tokenData = {
        accessToken: 'expired-access-token',
        // No refresh token
        expiresAt: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
      };
      
      // Mock getTokenData for this test
      jest.spyOn(require('./token-utils'), 'getTokenData')
        .mockResolvedValueOnce(tokenData);
      
      const token = await getValidAccessToken('user123');
      
      expect(token).toBeNull();
    });
  });
  
  describe('clearTokenData', () => {
    it('should delete the token cookie', async () => {
      await clearTokenData('user123');
      
      const { cookies } = require('next/headers');
      expect(cookies().delete).toHaveBeenCalledWith('token-user123');
    });
  });
});