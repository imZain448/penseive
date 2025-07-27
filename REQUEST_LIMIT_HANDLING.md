# Request Limit Error Handling and Halting Mechanism

## Overview

The Pensieve plugin now includes a comprehensive halting mechanism that detects when LLM providers return "request limit exceeded" errors and immediately stops command execution while notifying the user to choose a different model.

## How It Works

### 1. Custom Error Class

A custom `RequestLimitExceededError` class has been created to specifically identify rate limit and quota exceeded errors:

```javascript
export class RequestLimitExceededError extends Error {
    constructor(provider, model, message) {
        super(message);
        this.name = 'RequestLimitExceededError';
        this.provider = provider;
        this.model = model;
    }
}
```

### 2. LLM API Error Detection

Each LLM provider's API call method has been updated to detect specific error conditions:

#### OpenAI
- **Rate Limit (429)**: Detects HTTP 429 status codes
- **Quota Exceeded**: Detects `insufficient_quota` error codes and billing-related messages
- **Rate Limit Messages**: Detects error messages containing "rate limit" or "billing"

#### Google Gemini
- **Rate Limit (429)**: Detects HTTP 429 status codes
- **Resource Exhausted**: Detects `RESOURCE_EXHAUSTED` error codes
- **Quota Messages**: Detects error messages containing "quota" or "billing"

#### Anthropic
- **Rate Limit (429)**: Detects HTTP 429 status codes
- **Rate Limit Error Type**: Detects `rate_limit_error` error types
- **Quota Messages**: Detects error messages containing "quota" or "billing"

#### Ollama
- **Model Not Found**: Detects when the specified model is not available
- **Server Errors**: Detects server-related errors

### 3. Error Handling Utility

A utility function `handleRequestLimitError` provides consistent error handling:

```javascript
export function handleRequestLimitError(error, commandName) {
    if (error instanceof RequestLimitExceededError) {
        console.error(`Request limit exceeded in ${commandName}:`, error);
        
        // Show user notification with specific guidance
        const message = `⚠️ ${error.message}\n\nPlease choose a different model in the Pensieve settings.`;
        new Notice(message, 10000); // Show for 10 seconds
        
        // Log detailed error for debugging
        console.error('RequestLimitExceededError details:', {
            provider: error.provider,
            model: error.model,
            command: commandName,
            message: error.message
        });
        
        return true; // Indicate that the error was handled and execution should halt
    }
    
    return false; // Not a request limit error, let normal error handling proceed
}
```

### 4. Command Wrapper

A wrapper function `executeCommandWithErrorHandling` automatically handles request limit errors for commands:

```javascript
export async function executeCommandWithErrorHandling(commandFunction, commandName, ...args) {
    try {
        return await commandFunction(...args);
    } catch (error) {
        // Check if this is a request limit error
        if (handleRequestLimitError(error, commandName)) {
            // Halt execution - don't re-throw the error
            return null;
        }
        
        // For other errors, re-throw to let normal error handling proceed
        throw error;
    }
}
```

## Implementation Details

### Updated Functions

The following functions have been updated to use the error handling mechanism:

1. **`updateProjectMemories`** (memory-manager.js)
2. **`generateAutolog`** (autologs-manager.js)
3. **`refineProjectNotes`** (note-refiner.js)
4. **`performAnalysis`** (dashboard.jsx - AutologAnalyzeModal)

### Commands Affected

All Pensieve commands that use LLM calls are now protected:

- **Update Project Memories**
- **Refine Project Notes**
- **Generate Daily/Weekly/Monthly Autolog**
- **Autolog Analysis** (in dashboard)
- **Scheduled Tasks** (via scheduler)

### User Experience

When a request limit error occurs:

1. **Immediate Halt**: The command stops executing immediately
2. **User Notification**: A notice appears for 10 seconds with:
   - Warning icon (⚠️)
   - Specific error message
   - Guidance to choose a different model
3. **Console Logging**: Detailed error information is logged for debugging
4. **Graceful Degradation**: No partial results or corrupted data

## Example Error Messages

### OpenAI
```
⚠️ OpenAI rate limit exceeded. Please try again later or choose a different model.

Please choose a different model in the Pensieve settings.
```

### Gemini
```
⚠️ Gemini quota exceeded. Please check your billing or choose a different model.

Please choose a different model in the Pensieve settings.
```

### Anthropic
```
⚠️ Anthropic rate limit exceeded. Please try again later or choose a different model.

Please choose a different model in the Pensieve settings.
```

## Testing

A test file `test-request-limit-handling.js` demonstrates the mechanism:

```javascript
// Simulate a request limit error
throw new RequestLimitExceededError('openai', 'gpt-4', 'Rate limit exceeded');

// Handle the error
if (handleRequestLimitError(error, 'Test Command')) {
    console.log('Command halted due to request limit error');
    return; // Halt execution
}
```

## Benefits

1. **Immediate Response**: Commands halt instantly when rate limits are hit
2. **Clear User Guidance**: Users know exactly what to do (change model)
3. **No Partial Results**: Prevents incomplete or corrupted data
4. **Consistent Behavior**: All commands handle rate limits the same way
5. **Debugging Support**: Detailed logging for troubleshooting
6. **Provider Agnostic**: Works with all supported LLM providers

## Future Enhancements

Potential improvements could include:

1. **Automatic Retry**: Retry with exponential backoff for temporary rate limits
2. **Model Switching**: Automatically try alternative models
3. **Rate Limit Monitoring**: Track and display current usage
4. **Fallback Providers**: Switch to different providers when limits are hit
5. **User Preferences**: Allow users to set preferred fallback models 