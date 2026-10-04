/**
 * Smoke test for SLICT's local AI path, run by `scripts/verify.sh --with-ai`.
 *
 * Calls the app's own Ollama client against the throwaway Ollama container, so
 * AI features can be exercised without sending anything to a cloud model.
 * Synthetic input only: never put customer or production data in this prompt.
 *
 * The client reads OLLAMA_BASE_URL and OLLAMA_MODEL when it is imported, so
 * verify.sh sets them before this file loads.
 */
import {
  checkOllamaAvailability,
  generateChatCompletion,
  listModels,
} from '../../src/lib/ai/ollama-client';

async function main(): Promise<void> {
  const model = process.env.OLLAMA_MODEL;
  if (!model) {
    throw new Error('OLLAMA_MODEL is not set');
  }

  if (!(await checkOllamaAvailability())) {
    throw new Error(`Ollama is not reachable at ${process.env.OLLAMA_BASE_URL}`);
  }

  const models = await listModels();
  if (!models.some((name) => name === model || name.startsWith(`${model}:`))) {
    throw new Error(`Model ${model} is not available locally (found: ${models.join(', ') || 'none'})`);
  }

  const started = Date.now();
  const completion = await generateChatCompletion(
    [{ role: 'user', content: 'Reply with the single word OK.' }],
    { model, maxTokens: 16 },
  );
  const elapsedMs = Date.now() - started;
  const content = completion.choices[0]?.message?.content ?? '';

  if (!content.trim()) {
    throw new Error('The local model returned an empty response');
  }

  console.log(JSON.stringify({ model, elapsedMs, responseChars: content.length }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
