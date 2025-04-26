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

// Check if ai.on is a function before calling it. This prevents errors if Genkit is not fully initialized or if the on method is not available.
if (typeof ai.on === 'function') {
  ai.on('error', (err, event) => {
    console.error('Genkit error:', err, event);
  });
} else {
  console.warn('ai.on is not a function. This is unexpected, but continuing without error handling.');
}

export {ai};
