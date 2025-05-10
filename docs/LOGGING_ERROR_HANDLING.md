# Logging and Error Handling in Gemini Gateway

This document describes the logging and error handling approach implemented in the Gemini Gateway application. These utilities provide consistent and comprehensive logging across the application and standardized error handling to improve reliability and debuggability.

## Logging Utility

The logging utility (`src/lib/logger.ts`) provides a structured approach to logging with the following features:

### Features

- **Log Levels**: Support for different log levels (`debug`, `info`, `warn`, `error`)
- **Configurable**: Log level can be configured via environment variables
- **Metadata Support**: Logs can include structured metadata like module, method, user ID, etc.
- **Sensitive Data Masking**: Automatically masks sensitive information like tokens and passwords
- **Request Context Tracking**: Support for tracing requests through the system
- **Scoped Loggers**: Create module-specific loggers to avoid repetition

### Usage Examples

```typescript
// Basic usage
import { logger } from '@/lib/logger';

logger.info('User signed in');
logger.error('Failed to process request', error);

// With metadata
logger.info('User action completed', { 
  module: 'UserService', 
  method: 'completeAction',
  data: { userId: '123', actionType: 'purchase' }
});

// With request context for tracking across components
const context = createRequestContext(userId, projectId);
context.logger.info('Processing user request');

// Scoped logger for a specific module
const log = logger.createScoped('PaymentService');
log.info('Processing payment'); // Automatically includes module=PaymentService
```

### Log Format

Logs are formatted consistently:

```
[LEVEL] [module=ModuleName, method=methodName, userId=123, ...] Message {"dataKey": "dataValue"}
```

## Error Handling

The error utilities (`src/lib/error-utils.ts`) provide a consistent way to create, handle, and log errors.

### Features

- **Categorized Errors**: Errors are categorized (Authentication, Authorization, Validation, etc.)
- **Status Code Mapping**: Appropriate HTTP status codes for each error type
- **User-Friendly Messages**: Generate user-friendly error messages
- **Error Factory Functions**: Convenience functions for creating common error types
- **Error Handling Wrapper**: `withErrorHandling` function to consistently handle and log errors
- **API Error Handling**: Utilities to handle API responses and extract error information

### Error Categories

- `AUTHENTICATION`: User identity/login issues
- `AUTHORIZATION`: Permission issues
- `VALIDATION`: Input validation failures
- `API`: External API errors
- `DATABASE`: Database operation failures
- `NETWORK`: Network connectivity issues
- `UNKNOWN`: Uncategorized errors

### Usage Examples

```typescript
import { 
  createValidationError, 
  createApiError, 
  withErrorHandling 
} from '@/lib/error-utils';

// Creating errors
throw createValidationError('Email address is invalid');
throw createApiError('API rate limit exceeded', 429);

// Using withErrorHandling for consistent error handling
export async function getUserData(userId: string) {
  return withErrorHandling(
    async () => {
      // Function implementation...
      return userData;
    },
    'UserService', // Module name
    'getUserData', // Method name
    'Failed to retrieve user data' // Default error message
  );
}

// Handling API responses
const data = await handleApiResponse(response, 'APIClient', 'fetchData');
```

## Best Practices

1. **Be Consistent**: Use these utilities throughout the application for consistent logs and error handling
2. **Log Context**: Always include relevant context in logs (module, method, IDs)
3. **Log Levels**: Use appropriate log levels:
   - `debug`: Detailed information useful for debugging
   - `info`: Normal application behavior worth noting
   - `warn`: Unexpected behavior that doesn't prevent operation
   - `error`: Errors that prevent normal operation
4. **User Privacy**: Never log full PII; mask sensitive information
5. **Error Categories**: Use the most specific error category possible
6. **User Messages**: Keep user-facing error messages helpful but without exposing system details

## Environment Configuration

Configure logging behavior using environment variables:

```
LOG_LEVEL=debug|info|warn|error  # Default: info
```

## Testing Logging and Error Handling

The application includes comprehensive tests for both the logging and error handling utilities:

- `src/lib/logger.test.ts`: Tests for the logging functionality
- `src/lib/error-utils.test.ts`: Tests for the error handling functions

When writing tests for other components, mock these utilities to verify correct usage.