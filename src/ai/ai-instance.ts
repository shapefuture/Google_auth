import {Genkit, genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  console.error('GOOGLE_GENAI_API_KEY is not set in the environment.');
}

const ai: Genkit = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

ai.on('error', (err, event) => {
  console.error('Genkit error:', err, event);
});

export {ai};
