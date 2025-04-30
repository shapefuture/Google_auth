'use server';

import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { randomBytes } from 'crypto';
import { logger } from './logger';
import { createValidationError, withErrorHandling, createApiError, handleApiResponse } from './error-utils';

// Create a scoped logger for this module
const log = logger.createScoped('project-utils');

// Secret key for encryption (in a real app, this would be an environment variable)
// Note: This is a placeholder. In production, use a strong, properly managed secret
const ENCRYPTION_SECRET = new TextEncoder().encode(
  process.env.ENCRYPTION_SECRET || randomBytes(32).toString('hex')
);

/**
 * Validates if a Google Cloud Project ID is valid and properly set up
 * for use with the Gemini API
 */
export async function validateProjectId(projectId: string): Promise<{
  valid: boolean;
  message: string;
  details?: string[];
}> {
  return withErrorHandling(async () => {
    log.debug('Validating project ID', { method: 'validateProjectId', data: { projectId } });
    
    if (!projectId.trim()) {
      log.warn('Empty project ID provided', { method: 'validateProjectId' });
      return {
        valid: false,
        message: 'Project ID cannot be empty',
      };
    }

    // Simple regex validation for project ID format
    // Google Cloud project IDs must be 6-30 characters, lowercase letters, numbers, and hyphens
    const projectIdRegex = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
    if (!projectIdRegex.test(projectId)) {
      log.warn('Invalid project ID format', { method: 'validateProjectId', data: { projectId } });
      return {
        valid: false,
        message: 'Invalid Project ID format',
        details: [
          'Project IDs must be 6-30 characters',
          'Can only contain lowercase letters, numbers, and hyphens',
          'Must start with a letter',
          'Cannot end with a hyphen'
        ]
      };
    }

    // Validate that the project exists and has the Generative Language API enabled
    // Note: In a real implementation, we would make an actual API call to validate the project
    // For this implementation, we'll simulate the validation
    log.info('Simulating project validation', { method: 'validateProjectId', data: { projectId } });
    const apiResponse = await simulateProjectValidation(projectId);

    if (!apiResponse.exists) {
      log.warn('Project not found or not accessible', { method: 'validateProjectId', data: { projectId } });
      return {
        valid: false,
        message: 'Project not found or not accessible',
        details: [
          'Ensure the project exists and you have proper permissions',
          'The project must be created in the Google Cloud Console'
        ]
      };
    }

    if (!apiResponse.billingEnabled) {
      log.warn('Billing not enabled for project', { method: 'validateProjectId', data: { projectId } });
      return {
        valid: false,
        message: 'Billing is not enabled for this project',
        details: [
          'You must enable billing in the Google Cloud Console',
          'Visit: https://console.cloud.google.com/billing'
        ]
      };
    }

    if (!apiResponse.apiEnabled) {
      log.warn('Generative Language API not enabled for project', { method: 'validateProjectId', data: { projectId } });
      return {
        valid: false,
        message: 'Generative Language API is not enabled',
        details: [
          'Enable the API in the Google Cloud Console',
          'Visit: https://console.cloud.google.com/apis/library/generative-language.googleapis.com'
        ]
      };
    }

    log.info('Project validated successfully', { method: 'validateProjectId', data: { projectId } });
    return {
      valid: true,
      message: 'Project validated successfully',
    };
  }, 'project-utils', 'validateProjectId', 'Project validation failed');
}

/**
 * Helper function to simulate project validation
 * In a real implementation, this would make actual API calls to Google Cloud
 */
async function simulateProjectValidation(projectId: string): Promise<{
  exists: boolean;
  billingEnabled: boolean;
  apiEnabled: boolean;
}> {
  log.debug('Simulating project validation', { method: 'simulateProjectValidation', data: { projectId } });
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test cases for demonstration purposes
  if (projectId === 'invalid-project') {
    log.debug('Simulating invalid project', { method: 'simulateProjectValidation', data: { projectId } });
    return { exists: false, billingEnabled: false, apiEnabled: false };
  }
  
  if (projectId === 'no-billing-project') {
    log.debug('Simulating project without billing', { method: 'simulateProjectValidation', data: { projectId } });
    return { exists: true, billingEnabled: false, apiEnabled: false };
  }
  
  if (projectId === 'no-api-project') {
    log.debug('Simulating project without API enabled', { method: 'simulateProjectValidation', data: { projectId } });
    return { exists: true, billingEnabled: true, apiEnabled: false };
  }
  
  // Default case: project is valid
  log.debug('Simulating valid project', { method: 'simulateProjectValidation', data: { projectId } });
  return { exists: true, billingEnabled: true, apiEnabled: true };
}

/**
 * Securely stores the user's project ID
 */
export async function storeUserProjectId(userId: string, projectId: string | null): Promise<void> {
  return withErrorHandling(async () => {
    log.debug('Storing user project ID', { 
      method: 'storeUserProjectId', 
      userId, 
      data: { projectId }
    });
    
    try {
      if (projectId) {
        // Encrypt the project ID
        const encryptedProjectId = await new EncryptJWT({ projectId })
          .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
          .setIssuedAt()
          .setExpirationTime('1y') // 1 year expiration
          .encrypt(ENCRYPTION_SECRET);

        // Store in an HTTP-only cookie
        cookies().set({
          name: `project-${userId}`,
          value: encryptedProjectId,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 365 * 24 * 60 * 60, // 1 year
          path: '/',
          sameSite: 'lax',
        });
        
        log.info('Project ID stored successfully', { userId, data: { projectId } });
      } else {
        // Clear the cookie if projectId is null
        cookies().delete(`project-${userId}`);
        log.info('Project ID removed', { userId });
      }
    } catch (error) {
      log.error('Error storing project ID', error, { userId, data: { projectId } });
      throw error;
    }
  }, 'project-utils', 'storeUserProjectId', 'Failed to store user project ID');
}

/**
 * Retrieves the user's project ID from secure storage
 */
export async function getUserProjectId(userId: string): Promise<string | null> {
  return withErrorHandling(async () => {
    log.debug('Retrieving user project ID', { method: 'getUserProjectId', userId });
    
    try {
      const projectCookie = cookies().get(`project-${userId}`)?.value;
      
      if (!projectCookie) {
        log.debug('No project cookie found for user', { userId });
        return null;
      }

      const { payload } = await jwtDecrypt(projectCookie, ENCRYPTION_SECRET);
      const projectId = (payload as any).projectId || null;
      
      log.debug('Project ID retrieved successfully', { userId, data: { projectId } });
      return projectId;
    } catch (error) {
      log.error('Error retrieving project ID', error, { userId });
      return null;
    }
  }, 'project-utils', 'getUserProjectId', 'Failed to retrieve user project ID');
}

/**
 * Makes a test request to the Gemini API using the user's project ID
 * to ensure it's properly configured
 */
export async function testGeminiAccess(accessToken: string, projectId: string): Promise<{
  success: boolean;
  message: string;
}> {
  return withErrorHandling(async () => {
    log.info('Testing Gemini API access', { 
      method: 'testGeminiAccess', 
      data: { projectId }
    });
    
    try {
      // In a real implementation, make a test call to the Gemini API
      // For this implementation, we'll simulate a successful test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate success or failure based on project ID
      if (projectId === 'fail-test-project') {
        log.warn('Test request failed for project', { data: { projectId } });
        return {
          success: false,
          message: 'Test request failed. Check your project configuration.',
        };
      }
      
      log.info('Successfully connected to Gemini API', { data: { projectId } });
      return {
        success: true,
        message: 'Successfully connected to Gemini API with your project.',
      };
    } catch (error) {
      log.error('Gemini access test error', error, { data: { projectId } });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test Gemini API access',
      };
    }
  }, 'project-utils', 'testGeminiAccess', 'Failed to test Gemini API access');
}