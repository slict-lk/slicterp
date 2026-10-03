/**
 * Ollama Client - FREE Local LLM (No API costs!)
 * 
 * Install Ollama: https://ollama.ai
 * Then run: ollama pull llama2
 * 
 * This is 100% FREE and runs on your own machine!
 */

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
}

export interface FunctionDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama2';

/**
 * Generate a chat completion with Ollama (FREE!)
 */
export async function generateChatCompletion(
    messages: ChatMessage[],
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        functions?: FunctionDefinition[];
        functionCall?: 'auto' | 'none' | { name: string };
    }
) {
    try {
        const model = options?.model || DEFAULT_MODEL;

        // Build the prompt from messages
        let prompt = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                prompt += `System: ${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n\n`;
            } else if (msg.role === 'assistant') {
                prompt += `Assistant: ${msg.content}\n\n`;
            }
        }

        // Add function definitions to prompt if provided
        if (options?.functions && options.functions.length > 0) {
            prompt += '\nAvailable functions (you can call these by responding in JSON format):\n';
            for (const func of options.functions) {
                prompt += `- ${func.name}: ${func.description}\n`;
                prompt += `  Parameters: ${JSON.stringify(func.parameters.properties)}\n`;
            }
            prompt += '\nTo call a function, respond with: {"function": "function_name", "arguments": {...}}\n\n';
        }

        prompt += 'Assistant: ';

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature: options?.temperature || 0.7,
                    num_predict: options?.maxTokens || 2000,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();

        // Try to detect if response is a function call
        let functionCall = null;
        let content = data.response;

        try {
            // Check if response looks like JSON function call
            const trimmed = content.trim();
            if (trimmed.startsWith('{') && trimmed.includes('"function"')) {
                const parsed = JSON.parse(trimmed);
                if (parsed.function && parsed.arguments) {
                    functionCall = {
                        name: parsed.function,
                        arguments: JSON.stringify(parsed.arguments),
                    };
                    content = '';
                }
            }
        } catch (e) {
            // Not a function call, just regular response
        }

        // Return in OpenAI-compatible format
        return {
            choices: [
                {
                    message: {
                        role: 'assistant',
                        content,
                        function_call: functionCall,
                    },
                    finish_reason: functionCall ? 'function_call' : 'stop',
                },
            ],
        };
    } catch (error: any) {
        console.error('Ollama API Error:', error);

        // Fallback to simple response if Ollama is not running
        throw new Error('Ollama is not running. Please install Ollama or configure Groq API.');

        throw new Error(`Failed to generate completion: ${error.message}`);
    }
}

/**
 * Generate a streaming chat completion
 */
export async function* generateStreamingCompletion(
    messages: ChatMessage[],
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
) {
    try {
        const model = options?.model || DEFAULT_MODEL;

        // Build prompt
        let prompt = '';
        for (const msg of messages) {
            if (msg.role === 'system') {
                prompt += `System: ${msg.content}\n\n`;
            } else if (msg.role === 'user') {
                prompt += `User: ${msg.content}\n\n`;
            } else if (msg.role === 'assistant') {
                prompt += `Assistant: ${msg.content}\n\n`;
            }
        }
        prompt += 'Assistant: ';

        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                prompt,
                stream: true,
                options: {
                    temperature: options?.temperature || 0.7,
                    num_predict: options?.maxTokens || 2000,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.response) {
                        yield data.response;
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    } catch (error: any) {
        console.error('Ollama Streaming Error:', error);
        yield 'Error: AI service is not available. Please install Ollama.';
    }
}

/**
 * Check if Ollama is running and available
 */
export async function checkOllamaAvailability(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * List available models
 */
export async function listModels(): Promise<string[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
        return [];
    }
}

/**
 * Generate embeddings (not available in Ollama, return placeholder)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Ollama doesn't support embeddings yet
    // Return a simple hash-based embedding as placeholder
    console.warn('Embeddings not available with Ollama yet');
    return new Array(1536).fill(0);
}
