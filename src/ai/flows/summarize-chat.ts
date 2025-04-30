'use server';
/**
 * @fileOverview A chat summarization AI agent.
 *
 * - summarizeChat - A function that handles the chat summarization process.
 * - SummarizeChatInput - The input type for the summarizeChat function.
 * - SummarizeChatOutput - The return type for the summarizeChat function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

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
  try {
    console.log('summarizeChat called with input:', { 
      chatHistory: input.chatHistory?.substring(0, 50) + '...',
      userProject: input.userProject,
      accessToken: input.accessToken ? '[PRESENT]' : '[MISSING]'
    });
    const result = await summarizeChatFlow(input);
    console.log('summarizeChatFlow returned result');
    return result;
  } catch (error: any) {
    console.error('Error in summarizeChat:', error);
    throw new Error(`Failed to summarize chat: ${error.message}`);
  }
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
    const headers: HeadersInit = {};
    if (input.accessToken) {
      headers['Authorization'] = `Bearer ${input.accessToken}`;
    }
    if (input.userProject) {
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
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error: any) {
      console.error('Error in summarizeChatFlow:', error);
      throw new Error(`Failed to get summary from prompt: ${error.message}`);
    }
  }
);