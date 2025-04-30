import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { logger } from '@/lib/logger';
import { setupGoogleCloudProject } from '@/lib/cloud-project-service';

const log = logger.createScoped('api-setup-project');

// Store setup progress for each user
const setupProgress = new Map<string, {
  status: string;
  message: string;
  projectId?: string;
  error?: string;
  timestamp: number;
}>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}`;
  const reqLog = {
    debug: (msg: string, data?: any) => log.debug(msg, { requestId, data }),
    info: (msg: string, data?: any) => log.info(msg, { requestId, data }),
    warn: (msg: string, data?: any) => log.warn(msg, { requestId, data }),
    error: (msg: string, err?: any, data?: any) => log.error(msg, err, { requestId, data }),
  };

  reqLog.info(`API Request: ${req.method} ${req.url}`);

  try {
    // Get the user session
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      reqLog.warn('Unauthorized - No valid session');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id as string;
    const email = session.user.email as string;
    const name = session.user.name as string;
    
    // Handle different HTTP methods
    switch (req.method) {
      case 'POST':
        // Start setup process
        reqLog.info('Starting cloud project setup', { userId, email });
        
        if (!session.accessToken) {
          reqLog.warn('Missing access token', { userId });
          return res.status(400).json({ 
            error: 'Missing access token',
            message: 'Access token is required to set up a Google Cloud Project'
          });
        }
        
        // Clear any existing progress
        setupProgress.delete(userId);
        
        // Set initial progress
        setupProgress.set(userId, {
          status: 'pending',
          message: 'Starting setup...',
          timestamp: Date.now()
        });
        
        // Start setup process asynchronously (don't await)
        setupGoogleCloudProject(
          {
            userId,
            accessToken: session.accessToken,
            email,
            userName: name
          },
          (update) => {
            // Store progress updates
            setupProgress.set(userId, {
              ...update,
              timestamp: Date.now()
            });
            
            reqLog.info('Setup progress update', { 
              userId, 
              data: { 
                status: update.status,
                projectId: update.projectId 
              } 
            });
          }
        ).catch(error => {
          reqLog.error('Setup process error', error, { userId });
          setupProgress.set(userId, {
            status: 'failed',
            message: 'Setup failed',
            error: error.message || 'Unknown error',
            timestamp: Date.now()
          });
        });
        
        return res.status(202).json({ 
          message: 'Setup process started',
          status: 'pending'
        });
        
      case 'GET':
        // Get current setup progress
        const progress = setupProgress.get(userId);
        
        if (!progress) {
          reqLog.info('No setup progress found', { userId });
          return res.status(404).json({ 
            error: 'No setup in progress',
            message: 'No Google Cloud Project setup has been started'
          });
        }
        
        // Check for stale progress (older than 10 minutes)
        const isStale = Date.now() - progress.timestamp > 10 * 60 * 1000;
        
        if (isStale && progress.status !== 'complete' && progress.status !== 'failed') {
          reqLog.warn('Stale setup progress', { userId, data: { progress } });
          setupProgress.set(userId, {
            status: 'failed',
            message: 'Setup timed out',
            error: 'Setup process took too long and may have failed',
            timestamp: Date.now()
          });
          
          return res.status(200).json({
            status: 'failed',
            message: 'Setup timed out',
            error: 'Setup process took too long and may have failed',
          });
        }
        
        reqLog.info('Returning setup progress', { userId, data: { status: progress.status } });
        return res.status(200).json(progress);
        
      default:
        reqLog.warn(`Method not allowed: ${req.method}`);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    reqLog.error('Unexpected error handling request', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}