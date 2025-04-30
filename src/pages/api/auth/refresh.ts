import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './[...nextauth]';
import { getValidAccessToken } from '@/lib/token-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the user session
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get a valid access token (refreshing if necessary)
    const userId = session.user.id as string;
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
      return res.status(401).json({
        error: 'Failed to refresh access token',
        message: 'Your session has expired. Please sign in again.',
      });
    }

    // Return the refreshed token
    return res.status(200).json({
      accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + 3600, // Approximate expiry (1 hour)
    });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}