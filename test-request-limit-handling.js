/**
 * Test file to demonstrate the request limit error handling mechanism
 * This file shows how the halting mechanism works when LLM providers return rate limit errors
 */

import { RequestLimitExceededError, handleRequestLimitError } from './src/llm-extractor.js';

// Mock test function to simulate a command that might encounter rate limit errors
async function testCommand() {
    console.log('Starting test command...');

    // Simulate an LLM call that might fail
    try {
        // This would normally be an actual LLM API call
        throw new RequestLimitExceededError('openai', 'gpt-4', 'OpenAI rate limit exceeded. Please try again later or choose a different model.');
    } catch (error) {
        // Check if this is a request limit error
        if (handleRequestLimitError(error, 'Test Command')) {
            console.log('Command halted due to request limit error');
            return; // Halt execution
        }

        // For other errors, re-throw
        throw error;
    }

    console.log('This should not execute if request limit error occurred');
}

// Test the error handling
console.log('Testing request limit error handling...');
testCommand().then(() => {
    console.log('Test completed');
}).catch((error) => {
    console.log('Test failed with error:', error.message);
});

/**
 * Example usage in a real command:
 * 
 * // In a command function:
 * try {
 *     const extractor = new LLMExtractor(settings);
 *     const result = await extractor.extractTasks(notesContent);
 *     // Process result...
 * } catch (error) {
 *     if (handleRequestLimitError(error, 'Extract Tasks')) {
 *         return; // Halt execution immediately
 *     }
 *     // Handle other errors normally
 *     console.error('Other error:', error);
 * }
 */ 