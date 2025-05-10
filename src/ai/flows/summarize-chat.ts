'use server';
/**
 * @fileOverview A chat summarization AI agent.
 *
 * - summarizeChat - A function that handles the chat summarization process.
 * - SummarizeChatInput - The input type for the summarizeChat function.
 * - SummarizeChatOutput - The return type for the summarizeChat function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';
import { logger } from '@/lib/logger';
import { createApiError, withErrorHandling } from '@/lib/error-utils';

const log = logger.createScoped('summarize-chat');

const SummarizeChatInputSchema = z.object({
  chatHistory: z
    .string()
    .describe('The complete chat history to be summarized.'),
  userProject: z.string().optional().describe('The Google Cloud Project ID of the user.'),
  accessToken: z.string().optional().describe('The user access token.'),
});
export type SummarizeChatInput = z.infer<typeof SummarizeChatInputSchema>;

const SummarizeChatOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;

export async function summarizeChat(input: SummarizeChatInput): Promise<SummarizeChatOutput> {
  return withErrorHandling(async () => {
    log.info('Summarize chat called', {
      data: {
        chatHistoryLength: input.chatHistory.length,
        chatHistoryPreview: input.chatHistory.substring(0, 50) + '...',
        hasUserProject: !!input.userProject,
        hasAccessToken: !!input.accessToken,
      }
    });
    
    // Validate input
    if (!input.chatHistory.trim()) {
      throw createApiError('Chat history cannot be empty', 400);
    }
    
    if (!input.accessToken) {
      log.warn('No access token provided for API call');
    }
    
    const result = await summarizeChatFlow(input);
    
    log.info('Chat summarized successfully', {
      data: {
        summaryLength: result.summary.length,
      }
    });
    
    return result;
  }, 'summarize-chat', 'summarizeChat', 'Failed to summarize chat');
}

const prompt = ai.definePrompt({
  name: 'summarizeChatPrompt',
  input: {
    schema: z.object({
      chatHistory: z
        .string()
        .describe('The complete chat history to be summarized.'),
      userProject: z.string().optional().describe('The Google Cloud Project ID of the user.'),
      accessToken: z.string().optional().describe('The user access token.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the chat history.'),
    }),
  },
  prompt: `You are an AI assistant specializing in summarizing conversations.

  Please provide a concise summary of the following chat history:

  {{chatHistory}}
  `,
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

const summarizeChatFlow = ai.defineFlow<
  typeof SummarizeChatInputSchema,
  typeof SummarizeChatOutputSchema
>(
  {
    name: 'summarizeChatFlow',
    inputSchema: SummarizeChatInputSchema,
    outputSchema: SummarizeChatOutputSchema,
  },
  async input => {
    return withErrorHandling(async () => {
      log.debug('Summarize chat flow started', {
        data: {
          chatHistoryLength: input.chatHistory.length,
          hasUserProject: !!input.userProject,
          hasAccessToken: !!input.accessToken,
        }
      });
      
      const startTime = Date.now();
      const { output } = await prompt(input);
      const endTime = Date.now();
      
      log.info('Prompt response received', {
        data: {
          summaryLength: output?.summary.length,
          latencyMs: endTime - startTime,
        }
      });
      
      if (!output || !output.summary) {
        throw createApiError('Failed to get summary from Gemini API', 500);
      }
      
      return output;
    }, 'summarize-chat', 'summarizeChatFlow', 'Failed to get summary from prompt');
  }
);