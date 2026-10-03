// Small Ollama client wrapper for server-side use

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export interface OllamaGenerateOptions {
  model: string;
  prompt: string;
  stream?: boolean;
  // any additional properties passed-through to Ollama generate API
  [key: string]: any;
}

export async function ollamaGenerate(opts: OllamaGenerateOptions, timeoutMs = 15000) {
  const url = `${DEFAULT_OLLAMA_URL}/api/generate`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const bodyObj: Record<string, any> = { ...(opts || {}) };
    // Ensure the explicit keys are authoritative
    bodyObj.model = opts.model;
    bodyObj.prompt = opts.prompt;
    bodyObj.stream = opts.stream ?? false;
    const body = JSON.stringify(bodyObj);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });

    clearTimeout(id as any);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama responded with ${res.status}: ${text}`);
    }

    const data = await res.json().catch(() => null);

    // Ollama generate returns a top-level `response` or a streaming structure depending on model/options
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Ollama request timed out');
    }
    throw err;
  }
}

// Export as named; OllamaClient is the default export below
/**
 * Ollama AI Client for SLICT ERP
 * Provides integration with local Ollama LLM models
 */

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface OllamaTagsResponse {
  models: OllamaModel[];
}

/**
 * Ollama API Client
 * Handles communication with local Ollama server
 */
export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;

  constructor(
    baseUrl: string = process.env.OLLAMA_API_URL || 'http://localhost:11434',
    defaultModel: string = process.env.OLLAMA_MODEL || 'llama2',
    timeout: number = 60000
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.timeout = timeout;
  }

  /**
   * Check if Ollama server is running
   */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${this.baseUrl}/api/tags`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<OllamaModel[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(`${this.baseUrl}/api/tags`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: OllamaTagsResponse = await response.json();
        return data.models || [];
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      throw new Error('Failed to fetch available models from Ollama');
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(
    prompt: string,
    model: string = this.defaultModel,
    options?: Partial<OllamaGenerateRequest>
  ): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const request: OllamaGenerateRequest = {
          model,
          prompt,
          stream: false,
          temperature: options?.temperature ?? 0.7,
          top_p: options?.top_p ?? 0.9,
          top_k: options?.top_k ?? 40,
          num_predict: options?.num_predict ?? 512,
          ...options,
        };

        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: OllamaGenerateResponse = await response.json();
        return data.response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error('Failed to generate text using Ollama');
    }
  }

  /**
   * Generate text with streaming
   */
  async *generateStream(
    prompt: string,
    model: string = this.defaultModel,
    options?: Partial<OllamaGenerateRequest>
  ): AsyncGenerator<string> {
    try {
      const request: OllamaGenerateRequest = {
        model,
        prompt,
        stream: true,
        temperature: options?.temperature ?? 0.7,
        top_p: options?.top_p ?? 0.9,
        top_k: options?.top_k ?? 40,
        num_predict: options?.num_predict ?? 512,
        ...options,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data: OllamaGenerateResponse = JSON.parse(line);
              if (data.response) {
                yield data.response;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Error generating text stream:', error);
      throw new Error('Failed to generate text stream using Ollama');
    }
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.some(m => m.name.includes(modelName));
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull (download) a model
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

      try {
        const response = await fetch(`${this.baseUrl}/api/pull`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: modelName }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Consume the response body
        await response.text();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error pulling model:', error);
      throw new Error(`Failed to pull model: ${modelName}`);
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(modelName: string): Promise<OllamaModel | null> {
    try {
      const models = await this.getModels();
      return models.find(m => m.name === modelName) || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Process business data with AI
   */
  async analyzeSalesData(data: unknown): Promise<string> {
    const prompt = `Analyze the following sales data and provide key insights:\n\n${JSON.stringify(data, null, 2)}\n\nProvide:
1. Summary of performance
2. Key trends
3. Recommendations for improvement`;

    return this.generate(prompt);
  }

  /**
   * Generate business recommendations
   */
  async generateRecommendations(context: string): Promise<string> {
    const prompt = `Based on the following business context, provide strategic recommendations:\n\n${context}\n\nProvide 3-5 actionable recommendations.`;
    return this.generate(prompt);
  }

  /**
   * Summarize content
   */
  async summarize(content: string, maxLength: number = 500): Promise<string> {
    const prompt = `Please summarize the following content in approximately ${maxLength} characters:\n\n${content}`;
    return this.generate(prompt, this.defaultModel, { num_predict: Math.ceil(maxLength / 4) });
  }

  /**
   * Translate text
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    const prompt = `Translate the following text to ${targetLanguage}:\n\n${text}`;
    return this.generate(prompt);
  }

  /**
   * Generate business questions from data
   */
  async generateQuestions(data: unknown): Promise<string[]> {
    const prompt = `Based on the following data, generate 5 important business questions that could be analyzed:\n\n${JSON.stringify(data, null, 2)}\n\nReturn only the questions, one per line.`;

    const response = await this.generate(prompt);
    return response
      .split('\n')
      .filter(q => q.trim().length > 0)
      .slice(0, 5);
  }
}

/**
 * Create a singleton instance of OllamaClient
 */
let ollamaInstance: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaClient();
  }
  return ollamaInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetOllamaClient(): void {
  ollamaInstance = null;
}

export default OllamaClient;
