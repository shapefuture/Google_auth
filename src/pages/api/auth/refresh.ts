import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { getValidAccessToken } from '@/lib/token-utils';
import { logger } from '@/lib/logger';
import { AppError, ErrorCategory } from '@/lib/error-utils';

const log = logger.createScoped('api-auth-refresh');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;
  const reqLog = {
    debug: (msg: string, data?: any) => log.debug(msg, { requestId, data }),
    info: (msg: string, data?: any) => log.info(msg, { requestId, data }),
    warn: (msg: string, data?: any) => log.warn(msg, { requestId, data }),
    error: (msg: string, err?: any, data?: any) => log.error(msg, err, { requestId, data }),
  };

  reqLog.info(`API Request: ${req.method} ${req.url}`, { 
    headers: Object.entries(req.headers)
      .filter(([key]) => !['authorization', 'cookie'].includes(key.toLowerCase()))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
  });

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      reqLog.warn(`Method not allowed: ${req.method}`);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the user session
    reqLog.debug('Getting server session');
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      reqLog.warn('Unauthorized - No valid session');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id as string;
    reqLog.info('Processing token refresh request', { userId });

    // Get a valid access token (refreshing if necessary)
    reqLog.debug('Getting valid access token', { userId });
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      reqLog.warn('Failed to get valid access token', { userId });
      return res.status(401).json({
        error: 'Failed to refresh access token',
        message: 'Your session has expired. Please sign in again.',
      });
    }

    // Calculate approximate expiry (1 hour from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    
    reqLog.info('Token refresh successful', { userId });
    
    // Return the refreshed token
    return res.status(200).json({
      accessToken,
      expiresAt,
    });
  } catch (error) {
    // Handle different types of errors
    if (error instanceof AppError) {
      reqLog.error(`${error.category} error during token refresh`, error);
      
      return res.status(error.statusCode || 500).json({
        error: error.category,
        message: error.getUserMessage(),
      });
    } else {
      reqLog.error('Unexpected error during token refresh', error);
      
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }
}