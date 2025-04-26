'use server';
/**
 * @fileOverview A Gemini chatbot flow that takes a prompt as input and returns a response from the Gemini API.
 *
 * - generateResponse - A function that handles the chatbot interaction.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

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
  try {
    console.log('generateResponse called with input:', input);
    const result = await generateResponseFlow(input);
    console.log('generateResponseFlow returned:', result);
    return result;
  } catch (error: any) {
    console.error('Error in generateResponse:', error);
    throw new Error(`Failed to generate response: ${error.message}`);
  }
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
    try {
      console.log('generateResponseFlow called with input:', input);
      const {output} = await generateResponsePrompt(input);
      console.log('generateResponsePrompt returned:', output);
      return {
        response: output!.response,
      };
    } catch (error: any) {
      console.error('Error in generateResponseFlow:', error);
      throw new Error(`Failed to get response from prompt: ${error.message}`);
    }
  }
);
