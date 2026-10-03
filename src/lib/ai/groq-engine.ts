/**
 * Groq AI Engine - Provides Groq + Llama 3 integration
 * Handles initialization, status checks, and completion generation
 */

import { getGroqClient, ChatMessage, CompletionOptions } from './groq-client';

export interface GroqEngineConfig {
  enabled: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface GroqEngineStatus {
  available: boolean;
  connected: boolean;
  model: string;
  lastCheck: Date;
  error?: string;
}

class GroqEngine {
  private config: GroqEngineConfig;
  private status: GroqEngineStatus;
  private client = getGroqClient();

  constructor(config?: Partial<GroqEngineConfig>) {
    this.config = {
      enabled: true,
      model: process.env.GROQ_MODEL || 'llama-3-70b-versatile',
      temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '2000'),
      timeout: parseInt(process.env.GROQ_TIMEOUT || '60000'),
      ...config,
    };

    this.status = {
      available: false,
      connected: false,
      model: this.config.model,
      lastCheck: new Date(),
    };
  }

  /**
   * Initialize and validate Groq connection
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🤖 Initializing Groq AI Engine with Llama 3...');

      const isValid = await this.client.validateConnection();
      console.log('Connection validation result:', isValid);

      if (isValid) {
        this.status.connected = true;
        this.status.available = true;
        console.log(`✅ Groq AI Engine ready! Model: ${this.config.model}`);
        return true;
      } else {
        console.warn('⚠️ Groq connection failed check (likely timeout) - proceeding anyway');
        this.status.connected = false;
        this.status.available = true; // Optimistic: try anyway
        return false;
      }
    } catch (error: any) {
      console.error('❌ Failed to initialize Groq Engine:', error);
      this.status.error = error.message;
      this.status.available = true; // Optimistic: try anyway
      return false;
    }
  }

  /**
   * Generate completion (non-streaming)
   */
  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<{
    response: string;
    tokens: number;
    model: string;
  }> {
    if (!this.status.available) {
      throw new Error('Groq engine is not available. Call initialize() first.');
    }

    return this.client.generateCompletion(messages, {
      ...options,
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
    });
  }

  /**
   * Generate streaming completion
   */
  generateStreamingCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.status.available) {
      throw new Error('Groq engine is not available. Call initialize() first.');
    }

    return this.client.generateStreamingCompletion(messages, {
      ...options,
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxTokens ?? this.config.maxTokens,
    });
  }

  /**
   * Get engine status
   */
  getStatus(): GroqEngineStatus {
    return { ...this.status };
  }

  /**
   * Get engine configuration
   */
  getConfig(): GroqEngineConfig {
    return { ...this.config };
  }

  /**
   * Check and update connection status
   */
  async checkConnection(): Promise<boolean> {
    try {
      const isValid = await this.client.validateConnection();
      this.status.connected = isValid;
      this.status.lastCheck = new Date();
      return isValid;
    } catch (error: any) {
      this.status.error = error.message;
      this.status.connected = false;
      return false;
    }
  }
}

// Singleton instance
let groqEngineInstance: GroqEngine;

/**
 * Get or create Groq Engine singleton
 */
export function getGroqEngine(): GroqEngine {
  if (!groqEngineInstance) {
    groqEngineInstance = new GroqEngine();
  }
  return groqEngineInstance;
}

export { GroqEngine };
