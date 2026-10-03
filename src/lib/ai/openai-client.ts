import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    function_call?: {
        name: string;
        arguments: string;
    };
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

/**
 * Generate a chat completion with OpenAI
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
        const response = await openai.chat.completions.create({
            model: options?.model || 'gpt-4-turbo-preview',
            messages: messages as any,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2000,
            functions: options?.functions as any,
            function_call: options?.functionCall as any,
        });

        return response;
    } catch (error: any) {
        console.error('OpenAI API Error:', error);
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
        const stream = await openai.chat.completions.create({
            model: options?.model || 'gpt-4-turbo-preview',
            messages: messages as any,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 2000,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    } catch (error: any) {
        console.error('OpenAI Streaming Error:', error);
        throw new Error(`Failed to generate streaming completion: ${error.message}`);
    }
}

/**
 * Generate embeddings for text
 */
export async function generateEmbedding(text: string) {
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;
    } catch (error: any) {
        console.error('OpenAI Embedding Error:', error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

export { openai };
