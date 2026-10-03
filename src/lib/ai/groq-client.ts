/**
 * Groq API Client with Llama 3 Support
 * Handles streaming and non-streaming requests to Groq's inference API
 * Free tier with open-weight models (Llama 3, Mixtral)
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  name?: string; // required by Groq when role is 'function'
  function_call?: { name: string; arguments: string };
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  functions?: any[];
  functionCall?: 'auto' | 'none' | 'specific';
  // Real OpenAI-compatible tool calling, supported by Groq's API.
  // Pass tools in the shape: [{ type: 'function', function: { name, description, parameters } }]
  tools?: Array<{ type: 'function'; function: { name: string; description?: string; parameters?: any } }>;
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string, needs JSON.parse
  };
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

class GroqClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  private defaultModel: string = 'llama-3.3-70b-versatile';
  private timeout: number = 60000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('⚠️ GROQ_API_KEY not found. Please set the environment variable.');
    }

    // Override defaults from env
    this.defaultModel = process.env.GROQ_MODEL || this.defaultModel;
    this.timeout = parseInt(process.env.GROQ_TIMEOUT || '60000');
  }

  /**
   * Validate API key and connectivity
   */
  async validateConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        console.error('❌ GROQ_API_KEY is not configured');
        return false;
      }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
        const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
          signal: controller.signal,
      });
      
        clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Groq API connection validated');
        return true;
      } else if (response.status === 401) {
        console.error('❌ Invalid GROQ_API_KEY');
        return false;
      } else {
        console.error(`❌ Groq API error: ${response.status}`);
        return false;
      }
    } catch (error) {
        console.error('❌ Groq validation error (may be timeout or network):', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * Get list of available models from Groq
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error) {
      console.error('Error fetching models:', error);
      return [this.defaultModel];
    }
  }

  /**
   * Generate non-streaming completion
   */
  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<{
    response: string;
    tokens: number;
    model: string;
    functionCall?: any;
    toolCalls?: ToolCall[];
  }> {
    try {
      const model = options.model || this.defaultModel;
      const payload = this.buildRequestPayload(messages, {
        ...options,
        stream: false,
      });

      const response = await this.makeRequest(payload);
      const data = await response.json();

      if (!response.ok) {
        console.error('[GROQ ERROR DETAIL]', JSON.stringify(data.error));

        // Llama 3.3 on Groq occasionally emits a tool call in a malformed text
        // format instead of the proper structured one - but the intended call is
        // still visible in `failed_generation`, e.g. <function=name{"arg":"val"}>
        // </function>. Try to recover it instead of just giving up.
        if (data.error?.code === 'tool_use_failed' && data.error?.failed_generation) {
          const recovered = this.tryRecoverMalformedToolCall(data.error.failed_generation);
          if (recovered) {
            console.log('[GROQ RECOVERED TOOL CALL]', JSON.stringify(recovered));
            return {
              response: '',
              tokens: data.usage?.total_tokens || 0,
              model: options.model || this.defaultModel,
              toolCalls: [recovered],
            };
          }
        }

        throw new Error(
          `Groq API error: ${data.error?.message || response.statusText}`
        );
      }

      const message = data.choices[0]?.message || {};
      const content = message.content || '';
      const tokens = data.usage?.total_tokens || 0;
      // Real structured tool calls, only present when `tools` was passed in the request
      const toolCalls: ToolCall[] | undefined = message.tool_calls || undefined;

      return {
        response: content,
        tokens,
        model,
        toolCalls,
      };
    } catch (error: any) {
      console.error('Error in generateCompletion:', error);
      throw new Error(`Failed to generate completion: ${error.message}`);
    }
  }

  /**
   * Generate streaming completion with AsyncGenerator
   */
  async *generateStreamingCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = options.model || this.defaultModel;
      const payload = this.buildRequestPayload(messages, {
        ...options,
        stream: true,
      });

      const response = await this.makeRequest(payload);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Groq API error: ${error.error?.message || response.statusText}`
        );
      }

      // Transform the response into an AsyncGenerator
      if (!response.body) {
        throw new Error('No response body from Groq API');
      }

      yield* this.transformStreamResponse(response.body);
    } catch (error: any) {
      console.error('Error in generateStreamingCompletion:', error);
      throw new Error(`Failed to stream completion: ${error.message}`);
    }
  }

  /**
   * Transform Groq streaming response to AsyncGenerator<string>
   */
  private async *transformStreamResponse(
    body: ReadableStream<Uint8Array>
  ): AsyncGenerator<string, void, unknown> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    try {
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            yield buffer;
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Build request payload for Groq API
   */
  private buildRequestPayload(
    messages: ChatMessage[],
    options: CompletionOptions
  ): Record<string, any> {
    return {
      model: options.model || this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
      top_p: options.topP ?? 1.0,
      stream: options.stream ?? false,
      // Real OpenAI-compatible tool calling. This is the field Groq actually
      // reads to decide whether the model is allowed to call a function.
      // Without this, the model can only *talk about* calling a function,
      // which is why it was hallucinating fake "generate_sql_query(...)" text.
      ...(options.tools && {
        tools: options.tools,
        tool_choice: options.toolChoice || 'auto',
      }),
    };
  }

  /**
   * Make HTTP request to Groq API with proper headers and error handling
   */
  private async makeRequest(
    payload: Record<string, any>
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Best-effort recovery of a malformed tool call from Groq's failed_generation text.
   * Handles patterns like:
   *   <function=get_sales_summary{"period": "month"}</function>
   *   <function=query_database{"sql": "..."}></function>
   *   <function=list_all_customers/>                    (no-argument shorthand)
   * Returns null (no crash) if the text is too broken to recover (e.g. truncated
   * mid-argument) - the caller falls back to its normal error handling in that case.
   */
  private tryRecoverMalformedToolCall(failedGeneration: string): ToolCall | null {
    // No-argument shorthand first: <function=name/> or <function=name></function>
    const noArgMatch = failedGeneration.match(/<function=([a-zA-Z0-9_]+)\s*\/?>(?:\s*<\/function>)?/);
    if (noArgMatch && !failedGeneration.includes('{')) {
      return {
        id: `recovered_${Date.now()}`,
        type: 'function',
        function: { name: noArgMatch[1], arguments: '{}' },
      };
    }

    const match = failedGeneration.match(/<function=([a-zA-Z0-9_]+)\s*(\{[\s\S]*)/);
    if (!match) return null;

    const name = match[1];
    let argsText = match[2];
    // Strip a trailing </function> or > if present
    argsText = argsText.replace(/<\/function>\s*$/, '').replace(/>\s*$/, '').trim();

    try {
      // Confirm it's valid JSON before trusting it
      JSON.parse(argsText);
    } catch {
      return null; // Truncated or invalid - can't safely recover this one
    }

    return {
      id: `recovered_${Date.now()}`,
      type: 'function',
      function: { name, arguments: argsText },
    };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      model: this.defaultModel,
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      hasApiKey: !!this.apiKey,
    };
  }
}

// Singleton instance
let groqInstance: GroqClient;

export function getGroqClient(): GroqClient {
  if (!groqInstance) {
    groqInstance = new GroqClient();
  }
  return groqInstance;
}

export { GroqClient };