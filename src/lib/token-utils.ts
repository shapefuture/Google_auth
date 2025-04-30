'use server';

import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { randomBytes } from 'crypto';
import { logger } from './logger';
import { createAuthenticationError, createApiError, handleApiResponse, withErrorHandling } from './error-utils';

// Create a scoped logger for this module
const log = logger.createScoped('token-utils');

// Secret key for encryption (in a real app, this would be an environment variable)
// Note: This is a placeholder. In production, use a strong, properly managed secret
const ENCRYPTION_SECRET = new TextEncoder().encode(
  process.env.ENCRYPTION_SECRET || randomBytes(32).toString('hex')
);

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in seconds
}

/**
 * Encrypts and stores token data in a secure HTTP-only cookie
 */
export async function storeTokenData(userId: string, tokenData: TokenData): Promise<void> {
  return withErrorHandling(async () => {
    log.debug('Storing token data', { 
      method: 'storeTokenData', 
      userId,
      data: { expiresAt: tokenData.expiresAt, hasRefreshToken: !!tokenData.refreshToken }
    });

    // Encrypt the token data
    const encryptedToken = await new EncryptJWT(tokenData)
      .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
      .setIssuedAt()
      .setExpirationTime('30d') // Cookie expiration (not token)
      .encrypt(ENCRYPTION_SECRET);

    // Store in an HTTP-only cookie
    cookies().set({
      name: `token-${userId}`,
      value: encryptedToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
      sameSite: 'lax',
    });

    log.info('Token data stored successfully', { userId });
  }, 'token-utils', 'storeTokenData', 'Failed to store token data');
}

/**
 * Retrieves and decrypts token data from a secure HTTP-only cookie
 */
export async function getTokenData(userId: string): Promise<TokenData | null> {
  return withErrorHandling(async () => {
    log.debug('Retrieving token data', { method: 'getTokenData', userId });
    
    const tokenCookie = cookies().get(`token-${userId}`)?.value;

    if (!tokenCookie) {
      log.info('No token cookie found for user', { userId });
      return null;
    }

    try {
      const { payload } = await jwtDecrypt(tokenCookie, ENCRYPTION_SECRET);
      const tokenData = payload as unknown as TokenData;
      
      log.debug('Token data retrieved successfully', { 
        userId, 
        data: { 
          expiresAt: tokenData.expiresAt,
          expiresIn: tokenData.expiresAt - Math.floor(Date.now() / 1000),
          hasRefreshToken: !!tokenData.refreshToken 
        }
      });
      
      return tokenData;
    } catch (error) {
      log.error('Error decrypting token data', error, { userId });
      return null;
    }
  }, 'token-utils', 'getTokenData', 'Failed to retrieve token data');
}

/**
 * Checks if an access token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  // Add a 5 minute buffer to handle clock skew and network latency
  const bufferTime = 5 * 60; // 5 minutes in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expiresAt - currentTime;
  
  log.debug('Checking token expiration', { 
    method: 'isTokenExpired',
    data: { 
      expiresAt,
      currentTime,
      timeUntilExpiry,
      bufferTime,
      isExpired: currentTime >= expiresAt - bufferTime
    }
  });
  
  return currentTime >= expiresAt - bufferTime;
}

/**
 * Refreshes an expired access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  return withErrorHandling(async () => {
    log.info('Refreshing access token', { method: 'refreshAccessToken' });

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw createAuthenticationError(
        'Google OAuth credentials are missing',
        { missingKeys: !process.env.GOOGLE_CLIENT_ID ? 'GOOGLE_CLIENT_ID' : 'GOOGLE_CLIENT_SECRET' }
      );
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    log.request('POST', tokenUrl, { 
      grant_type: 'refresh_token',
      client_id: '[REDACTED]',
      client_secret: '[REDACTED]',
      refresh_token: '[REDACTED]'
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await handleApiResponse<{
      access_token: string;
      expires_in: number;
      scope: string;
      token_type: string;
    }>(response, 'token-utils', 'refreshAccessToken');

    // Calculate expiration time
    const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    log.info('Access token refreshed successfully', { 
      data: { 
        expires_in: data.expires_in,
        expiresAt,
        scope: data.scope
      }
    });

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  }, 'token-utils', 'refreshAccessToken', 'Failed to refresh access token');
}

/**
 * Gets a valid access token, refreshing it if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  return withErrorHandling(async () => {
    log.debug('Getting valid access token', { method: 'getValidAccessToken', userId });
    
    const tokenData = await getTokenData(userId);

    if (!tokenData) {
      log.warn('No token data found for user', { userId });
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(tokenData.expiresAt)) {
      log.info('Access token expired, attempting to refresh', { 
        userId,
        data: { 
          expiresAt: tokenData.expiresAt, 
          expiresIn: tokenData.expiresAt - Math.floor(Date.now() / 1000)
        }
      });
      
      if (!tokenData.refreshToken) {
        log.warn('No refresh token available for user', { userId });
        return null;
      }

      // Refresh the token
      const newTokenData = await refreshAccessToken(tokenData.refreshToken);
      
      log.debug('Storing new token data after refresh', { userId });
      
      // Store the new token data
      await storeTokenData(userId, {
        accessToken: newTokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: newTokenData.expiresAt,
      });

      return newTokenData.accessToken;
    }

    // Token is still valid
    log.debug('Access token is still valid', { 
      userId,
      data: { 
        expiresAt: tokenData.expiresAt,
        expiresIn: tokenData.expiresAt - Math.floor(Date.now() / 1000)
      }
    });
    
    return tokenData.accessToken;
  }, 'token-utils', 'getValidAccessToken', 'Failed to get valid access token');
}

/**
 * Clears the stored token data
 */
export async function clearTokenData(userId: string): Promise<void> {
  return withErrorHandling(async () => {
    log.info('Clearing token data', { method: 'clearTokenData', userId });
    cookies().delete(`token-${userId}`);
    log.debug('Token data cleared successfully', { userId });
  }, 'token-utils', 'clearTokenData', 'Failed to clear token data');
}