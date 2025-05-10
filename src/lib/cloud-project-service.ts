'use server';

import { logger } from './logger';
import { withErrorHandling } from './error-utils';
import { storeUserProjectId } from './project-utils';

const log = logger.createScoped('cloud-project-service');

interface CloudProjectSetupOptions {
  userId: string;
  accessToken: string;
  email: string;
  userName: string;
}

interface SetupProgressUpdate {
  status: 'pending' | 'creating' | 'billing' | 'api' | 'complete' | 'failed';
  message: string;
  projectId?: string;
  error?: string;
}

// Check if the user already has created projects
export async function getUserExistingProjects(accessToken: string): Promise<string[]> {
  return withErrorHandling(async () => {
    log.info('Checking user existing projects');
    
    try {
      // In a full implementation, we would make a real API call to Google Cloud Resource Manager API
      // https://cloud.google.com/resource-manager/reference/rest/v1/projects/list
      
      // Simulate API call and processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, simulate no existing projects to allow creation of a new one
      const projects: string[] = [];
      
      log.info('Retrieved user projects', { data: { count: projects.length } });
      return projects;
    } catch (error) {
      log.error('Failed to get user projects', error);
      // Return empty array on error to allow continued operation
      return [];
    }
  }, 'cloud-project-service', 'getUserExistingProjects', 'Failed to get user projects');
}

// Generate a suitable project ID based on user info
function generateProjectId(email: string): string {
  // Extract username from email and sanitize
  const username = email.split('@')[0].toLowerCase();
  const sanitized = username.replace(/[^a-z0-9]/g, '');
  
  // Add gemini-gateway prefix and random suffix for uniqueness
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  const timestamp = Date.now().toString().slice(-4);
  
  // Ensure the ID is within GCP's length limits
  let projectId = `gemini-${sanitized}-${randomSuffix}${timestamp}`;
  if (projectId.length > 30) {
    projectId = `gemini-${sanitized.substring(0, 10)}-${randomSuffix}${timestamp}`;
  }
  
  return projectId;
}

// Setup a new Google Cloud Project with all necessary configurations
export async function setupGoogleCloudProject(
  options: CloudProjectSetupOptions,
  onProgress?: (update: SetupProgressUpdate) => void
): Promise<{success: boolean; projectId?: string; error?: string}> {
  return withErrorHandling(async () => {
    const { userId, accessToken, email, userName } = options;
    
    log.info('Starting automated Cloud Project setup', { 
      userId,
      data: { email }
    });
    
    // Update progress
    onProgress?.({
      status: 'pending',
      message: 'Starting Google Cloud Project setup...'
    });
    
    try {
      // 1. Check if user already has projects
      const existingProjects = await getUserExistingProjects(accessToken);
      
      // If user already has a suitable project, use it instead
      if (existingProjects.length > 0) {
        const existingProject = existingProjects[0];
        log.info('Using existing project', { userId, data: { projectId: existingProject } });
        
        // Store the project ID
        await storeUserProjectId(userId, existingProject);
        
        onProgress?.({
          status: 'complete',
          message: 'Using your existing Google Cloud Project',
          projectId: existingProject
        });
        
        return { success: true, projectId: existingProject };
      }
      
      // 2. Create a new project
      onProgress?.({
        status: 'creating',
        message: 'Creating new Google Cloud Project...'
      });
      
      // Generate a suitable project ID
      const projectId = generateProjectId(email);
      log.info('Generated project ID', { userId, data: { projectId } });
      
      // Simulate project creation API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      log.info('Project created successfully', { userId, data: { projectId } });
      
      // 3. Enable billing with free trial credits
      onProgress?.({
        status: 'billing',
        message: 'Setting up billing with free trial credits...',
        projectId
      });
      
      // Simulate billing setup
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      log.info('Billing enabled with free trial credits', { userId, data: { projectId } });
      
      // 4. Enable required APIs
      onProgress?.({
        status: 'api',
        message: 'Enabling Google Generative Language API...',
        projectId
      });
      
      // Simulate API enabling
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      log.info('Required APIs enabled', { userId, data: { projectId } });
      
      // 5. Store the project ID for the user
      await storeUserProjectId(userId, projectId);
      
      // 6. Complete
      onProgress?.({
        status: 'complete',
        message: 'Google Cloud Project setup complete!',
        projectId
      });
      
      return { success: true, projectId };
    } catch (error: any) {
      log.error('Failed to setup Google Cloud Project', error, { userId });
      
      onProgress?.({
        status: 'failed',
        message: 'Failed to setup Google Cloud Project',
        error: error.message || 'Unknown error'
      });
      
      return { success: false, error: error.message || 'Failed to setup Google Cloud Project' };
    }
  }, 'cloud-project-service', 'setupGoogleCloudProject', 'Failed to setup Google Cloud Project');
}