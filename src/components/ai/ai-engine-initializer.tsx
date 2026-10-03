/**
 * AI Engine Initializer
 * Server component that initializes the AI engine on app startup
 * Place this in your root layout
 */

import { initializeAIEngine } from '@/lib/ai/engine-init';

export async function AIEngineInitializer() {
  // Initialize on app startup
  await initializeAIEngine();

  // This is a server component, nothing to render
  return null;
}
