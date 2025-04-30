import { Genkit, genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { logger } from '@/lib/logger';

const log = logger.createScoped('ai-instance');

const apiKey = process.env.GOOGLE_GENAI_API_KEY;

if (!apiKey) {
  log.error('GOOGLE_GENAI_API_KEY is not set in the environment.');
} else {
  log.info('GOOGLE_GENAI_API_KEY is configured');
}

log.debug('Initializing Genkit with GoogleAI plugin');

const ai: Genkit = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

log.info('Genkit initialized', { 
  data: { 
    model: 'googleai/gemini-2.0-flash',
    hasApiKey: !!apiKey,
  }
});

// Check if ai.on is a function before calling it. This prevents errors if Genkit is not fully initialized or if the on method is not available.
if (typeof ai.on === 'function') {
  log.debug('Setting up Genkit error handler');
  
  ai.on('error', (err, event) => {
    log.error('Genkit error', err, { 
      data: {
        event,
        errorName: err.name,
        errorMessage: err.message,
      }
    });
  });
  
  ai.on('beforeRequest', (event) => {
    log.debug('Genkit beforeRequest event', { 
      data: {
        model: event.model,
        hasInputs: !!event.inputs,
        hasStreamingOptions: !!event.streamingOptions,
        hasApiOptions: !!event.apiOptions,
      }
    });
  });
  
  ai.on('afterResponse', (event) => {
    log.debug('Genkit afterResponse event', { 
      data: {
        model: event.model,
        success: event.success,
        latencyMs: event.latencyMs,
      }
    });
  });
  
  log.info('Genkit event handlers configured');
} else {
  log.warn('ai.on is not a function. This is unexpected, but continuing without error handling.');
}

export { ai };