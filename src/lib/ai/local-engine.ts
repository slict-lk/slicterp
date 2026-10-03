/**
 * Local AI Engine Configuration & Manager
 * Handles Ollama setup, model management, and fallback strategies
 */

import { generateChatCompletion, ChatMessage, FunctionDefinition } from './ollama-client';

export interface LocalAIConfig {
  enabled: boolean;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  fallbackMode: boolean;
  provider?: 'ollama' | 'local_process' | 'mock';
  localUrl?: string;
}

export interface AIEngineStatus {
  available: boolean;
  connected: boolean;
  model: string;
  modelLoaded: boolean;
  lastCheck: Date;
  error?: string;
}

class LocalAIEngine {
  private config: LocalAIConfig;
  private status: AIEngineStatus;
  private statusCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<LocalAIConfig>) {
    this.config = {
      enabled: true,
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '2000'),
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000'),
      fallbackMode: process.env.OLLAMA_FALLBACK_MODE === 'true',
      provider: (process.env.LOCAL_AI_PROVIDER as any) || (process.env.OLLAMA_BASE_URL ? 'ollama' : 'local_process'),
      localUrl: process.env.LOCAL_AI_URL || 'http://localhost:5005',
      ...config,
    };

    this.status = {
      available: false,
      connected: false,
      model: this.config.model,
      modelLoaded: false,
      lastCheck: new Date(),
    };
  }

  /**
   * Initialize the AI engine
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🤖 Initializing Local AI Engine...');
      const connected = await this.checkConnection();
      
      if (connected) {
        this.status.connected = true;
        const modelLoaded = await this.checkModel();
        this.status.modelLoaded = modelLoaded;
        this.status.available = true;
        console.log('✅ Local AI Engine ready!');
        return true;
      } else {
        console.warn('⚠️ Local AI Engine not available - using fallback mode');
        this.status.available = false;
        this.config.fallbackMode = true;
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Local AI Engine:', error);
      this.status.available = false;
      this.config.fallbackMode = true;
      return false;
    }
  }

  /**
   * Check connection to Ollama server
   */
  async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      if (this.config.provider === 'local_process') {
        const url = `${this.config.localUrl}/health`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        return res.ok;
      }

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if the model is loaded
   */
  async checkModel(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      if (this.config.provider === 'local_process') {
        const res = await fetch(`${this.config.localUrl}/models`, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return false;
        const data = await res.json();
        const models = data.models || [];
        return models.some((m: string) => m.includes(this.config.model));
      }

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      if (!response.ok) return false;

      const data = await response.json();
      const models = data.models || [];
      return models.some((m: any) => m.name.includes(this.config.model));
    } catch (error) {
      return false;
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      console.log(`📥 Pulling model: ${modelName}...`);
      if (this.config.provider === 'local_process') {
        // Local process server may support pulling; call /pull if implemented
        try {
          const res = await fetch(`${this.config.localUrl}/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelName }),
          });
          if (!res.ok) throw new Error('Pull failed');
          console.log(`✅ Model ${modelName} pulled successfully (local process)`);
          return true;
        } catch (err) {
          console.warn('Local process pull not supported or failed:', err);
          return false;
        }
      }

      const response = await fetch(`${this.config.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      console.log(`✅ Model ${modelName} pulled successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to pull model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Generate chat completion with fallback support
   */
  async generateCompletion(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      functions?: FunctionDefinition[];
      functionCall?: 'auto' | 'none' | { name: string };
    }
  ): Promise<{ response: string; functionCall?: any; error?: string }> {
    // Try local AI first if available and not in fallback mode
    if (this.status.available && !this.config.fallbackMode) {
      try {
        // If configured to use a local process server, call it
        if (this.config.provider === 'local_process') {
          const prompt = messages
            .map((m) => {
              if (m.role === 'system') return `System: ${m.content}`;
              if (m.role === 'user') return `User: ${m.content}`;
              if (m.role === 'assistant') return `Assistant: ${m.content}`;
              return `${m.role}: ${m.content}`;
            })
            .join('\n\n') + '\n\nAssistant: ';

          const body = {
            model: options?.model || this.config.model,
            prompt,
            temperature: options?.temperature ?? this.config.temperature,
            max_tokens: options?.maxTokens ?? this.config.maxTokens,
            stream: false,
          };

          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), this.config.timeout);

          const res = await fetch(`${this.config.localUrl}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(id as any);

          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Local AI server responded ${res.status}: ${text}`);
          }

          const data = await res.json().catch(() => null);
          if (data?.response) return { response: data.response, functionCall: data.function_call };
          return { response: JSON.stringify(data) };
        }

        // Default: call built-in Ollama client
        const result: any = await generateChatCompletion(messages, {
          model: options?.model || this.config.model,
          temperature: options?.temperature || this.config.temperature,
          maxTokens: options?.maxTokens || this.config.maxTokens,
          functions: options?.functions,
          functionCall: options?.functionCall,
        });

        // Normalize response format
        if (result.response) {
          return { response: result.response, functionCall: result.functionCall };
        }
        if (result.choices?.[0]?.message?.content) {
          return { response: result.choices[0].message.content };
        }

        return { response: JSON.stringify(result) };
      } catch (error: any) {
        console.error('Error with local AI, falling back to offline placeholder:', error.message || error);
      }
    }

    // Return a neutral offline placeholder for fallback (do not fabricate data)
    return this.generateOfflinePlaceholder(messages);
  }

  /**
   * Generate mock AI response (for fallback/offline mode)
   */
  private generateOfflinePlaceholder(messages: ChatMessage[]): {
    response: string;
    functionCall?: any;
  } {
    // Do not fabricate domain-specific data. Provide a neutral offline message
    const lastUserMessage = messages.slice().reverse().find((m) => m.role === 'user')?.content || '';

    const response = `⚠️ AI unavailable. The application is running in offline mode and cannot provide live data-driven responses.\n\nTo enable real AI replies, configure Groq (set GROQ_API_KEY) or start your local Ollama server.\n\nYour message: "${lastUserMessage.substring(0, 200)}${lastUserMessage.length > 200 ? '...' : ''}"`;

    return { response };
  }

  /**
   * Get current engine status
   */
  getStatus(): AIEngineStatus {
    return { ...this.status };
  }

  /**
   * Get current configuration
   */
  getConfig(): LocalAIConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LocalAIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable/disable AI engine
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.config.fallbackMode = true;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number = 30000): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }

    this.statusCheckInterval = setInterval(async () => {
      const connected = await this.checkConnection();
      this.status.connected = connected;
      this.status.lastCheck = new Date();

      if (connected) {
        const modelLoaded = await this.checkModel();
        this.status.modelLoaded = modelLoaded;
        this.status.available = modelLoaded;
      }
    }, intervalMs);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
  }
}

// Singleton instance
let engine: LocalAIEngine | null = null;

export function getLocalAIEngine(): LocalAIEngine {
  if (!engine) {
    engine = new LocalAIEngine();
  }
  return engine;
}

export function createLocalAIEngine(config?: Partial<LocalAIConfig>): LocalAIEngine {
  engine = new LocalAIEngine(config);
  return engine;
}
