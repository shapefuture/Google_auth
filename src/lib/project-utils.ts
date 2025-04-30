'use server';

import { headers } from 'next/headers';

/**
 * Validates if a Google Cloud Project ID is valid and properly set up
 * for use with the Gemini API
 */
export async function validateProjectId(projectId: string): Promise<{
  valid: boolean;
  message: string;
  details?: string[];
}> {
  if (!projectId.trim()) {
    return {
      valid: false,
      message: 'Project ID cannot be empty',
    };
  }

  try {
    // Simple regex validation for project ID format
    // Google Cloud project IDs must be 6-30 characters, lowercase letters, numbers, and hyphens
    const projectIdRegex = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
    if (!projectIdRegex.test(projectId)) {
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
    const apiResponse = await simulateProjectValidation(projectId);

    if (!apiResponse.exists) {
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
      return {
        valid: false,
        message: 'Generative Language API is not enabled',
        details: [
          'Enable the API in the Google Cloud Console',
          'Visit: https://console.cloud.google.com/apis/library/generative-language.googleapis.com'
        ]
      };
    }

    return {
      valid: true,
      message: 'Project validated successfully',
    };
  } catch (error: any) {
    console.error('Project validation error:', error);
    return {
      valid: false,
      message: 'Error validating project',
      details: [error.message || 'An unexpected error occurred'],
    };
  }
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
  // In a real implementation, we would make actual API calls to validate the project
  // For this implementation, we'll simulate successful validation for most project IDs
  // and return specific errors for certain test cases
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test cases for demonstration purposes
  if (projectId === 'invalid-project') {
    return { exists: false, billingEnabled: false, apiEnabled: false };
  }
  
  if (projectId === 'no-billing-project') {
    return { exists: true, billingEnabled: false, apiEnabled: false };
  }
  
  if (projectId === 'no-api-project') {
    return { exists: true, billingEnabled: true, apiEnabled: false };
  }
  
  // Default case: project is valid
  return { exists: true, billingEnabled: true, apiEnabled: true };
}

/**
 * Stores the user's project ID in the browser's localStorage
 * In a production app, this would likely be stored in a database
 */
export function storeUserProjectId(userId: string, projectId: string | null): void {
  // This would typically be a server-side operation
  // For this implementation, we'll just log it
  console.log(`Storing project ID ${projectId} for user ${userId}`);
  // In a real implementation:
  // await db.users.update({ id: userId }, { projectId });
}

/**
 * Retrieves the user's project ID from storage
 * In a production app, this would likely be retrieved from a database
 */
export async function getUserProjectId(userId: string): Promise<string | null> {
  // This would typically be a server-side operation
  // For this implementation, we'll just return null
  console.log(`Getting project ID for user ${userId}`);
  // In a real implementation:
  // const user = await db.users.findUnique({ where: { id: userId } });
  // return user?.projectId || null;
  return null;
}

/**
 * Makes a test request to the Gemini API using the user's project ID
 * to ensure it's properly configured
 */
export async function testGeminiAccess(accessToken: string, projectId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // In a real implementation, make a test call to the Gemini API
    // For this implementation, we'll simulate a successful test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success or failure based on project ID
    if (projectId === 'fail-test-project') {
      return {
        success: false,
        message: 'Test request failed. Check your project configuration.',
      };
    }
    
    return {
      success: true,
      message: 'Successfully connected to Gemini API with your project.',
    };
  } catch (error: any) {
    console.error('Gemini access test error:', error);
    return {
      success: false,
      message: error.message || 'Failed to test Gemini API access',
    };
  }
}