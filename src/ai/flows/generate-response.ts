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
  return generateResponseFlow(input);
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
    const {output} = await generateResponsePrompt(input);
    return {
      response: output!.response,
    };
  }
);
