'use server';

import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { randomBytes } from 'crypto';

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
  try {
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

    console.log(`Token data stored for user ${userId}`);
  } catch (error) {
    console.error('Error storing token data:', error);
    throw new Error('Failed to store token data');
  }
}

/**
 * Retrieves and decrypts token data from a secure HTTP-only cookie
 */
export async function getTokenData(userId: string): Promise<TokenData | null> {
  try {
    const tokenCookie = cookies().get(`token-${userId}`)?.value;

    if (!tokenCookie) {
      return null;
    }

    const { payload } = await jwtDecrypt(tokenCookie, ENCRYPTION_SECRET);
    return payload as unknown as TokenData;
  } catch (error) {
    console.error('Error retrieving token data:', error);
    return null;
  }
}

/**
 * Checks if an access token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  // Add a 5 minute buffer to handle clock skew and network latency
  const bufferTime = 5 * 60; // 5 minutes in seconds
  return Math.floor(Date.now() / 1000) >= expiresAt - bufferTime;
}

/**
 * Refreshes an expired access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: number;
}> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to refresh access token');
    }

    // Calculate expiration time
    const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Gets a valid access token, refreshing it if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const tokenData = await getTokenData(userId);

    if (!tokenData) {
      console.warn('No token data found for user:', userId);
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(tokenData.expiresAt)) {
      console.log('Access token expired, attempting to refresh');
      
      if (!tokenData.refreshToken) {
        console.warn('No refresh token available for user:', userId);
        return null;
      }

      // Refresh the token
      const newTokenData = await refreshAccessToken(tokenData.refreshToken);
      
      // Store the new token data
      await storeTokenData(userId, {
        accessToken: newTokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: newTokenData.expiresAt,
      });

      return newTokenData.accessToken;
    }

    // Token is still valid
    return tokenData.accessToken;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

/**
 * Clears the stored token data
 */
export async function clearTokenData(userId: string): Promise<void> {
  cookies().delete(`token-${userId}`);
}