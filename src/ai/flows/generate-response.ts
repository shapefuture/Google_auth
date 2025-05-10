'use server';
/**
 * @fileOverview A Gemini chatbot flow that takes a prompt as input and returns a response from the Gemini API.
 *
 * - generateResponse - A function that handles the chatbot interaction.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { createApiError, withErrorHandling } from '@/lib/error-utils';

const log = logger.createScoped('generate-response');

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to send to the Gemini API.'),
  userProject: z.string().optional().describe('The Google Cloud Project ID of the user.'),
  accessToken: z.string().optional().describe('The user access token.'),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The response from the Gemini API.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return withErrorHandling(async () => {
    log.info('Generate response called', {
      data: {
        promptLength: input.prompt.length,
        hasUserProject: !!input.userProject,
        hasAccessToken: !!input.accessToken,
      }
    });
    
    // Validate input
    if (!input.prompt.trim()) {
      throw createApiError('Prompt cannot be empty', 400);
    }
    
    if (!input.accessToken) {
      log.warn('No access token provided for API call');
    }

    // Call flow to generate response
    const result = await generateResponseFlow(input);
    
    log.info('Response generated successfully', {
      data: {
        responseLength: result.response.length,
      }
    });
    
    return result;
  }, 'generate-response', 'generateResponse', 'Failed to generate response');
}

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {
    schema: z.object({
      prompt: z.string().describe('The prompt to send to the Gemini API.'),
      userProject: z.string().optional().describe('The Google Cloud Project ID of the user.'),
      accessToken: z.string().optional().describe('The user access token.'),
    }),
  },
  output: {
    schema: z.object({
      response: z.string().describe('The response from the Gemini API.'),
    }),
  },
  prompt: `{{prompt}}`,
  options: ({
    input
  }) => {
    log.debug('Configuring API options for prompt', {
      data: {
        hasAccessToken: !!input.accessToken,
        hasUserProject: !!input.userProject,
      }
    });
    
    const headers: HeadersInit = {};
    if (input.accessToken) {
      log.debug('Adding Authorization header');
      headers['Authorization'] = `Bearer ${input.accessToken}`;
    }
    if (input.userProject) {
      log.debug('Adding X-Goog-User-Project header', { data: { userProject: input.userProject } });
      headers['X-Goog-User-Project'] = input.userProject;
    }

    return {
      apiOptions: {
        headers,
      },
    };
  }
});

const generateResponseFlow = ai.defineFlow<
  typeof GenerateResponseInputSchema,
  typeof GenerateResponseOutputSchema
>(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    return withErrorHandling(async () => {
      log.debug('Generate response flow started', {
        data: {
          promptLength: input.prompt.length,
          hasUserProject: !!input.userProject,
          hasAccessToken: !!input.accessToken,
        }
      });
      
      const startTime = Date.now();
      const { output } = await generateResponsePrompt(input);
      const endTime = Date.now();
      
      log.info('Prompt response received', {
        data: {
          responseLength: output?.response.length,
          latencyMs: endTime - startTime,
        }
      });
      
      if (!output || !output.response) {
        throw createApiError('Failed to get response from Gemini API', 500);
      }
      
      return {
        response: output.response,
      };
    }, 'generate-response', 'generateResponseFlow', 'Failed to get response from prompt');
  }
);