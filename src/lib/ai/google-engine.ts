/**
 * Google Gemini AI Engine - Provides Google Gemini integration
 * Uses REST API directly for maximum compatibility and control
 */

export interface GeminiChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
    original_parts?: any[];
  };
}

/**
 * Generate a completion using Google Gemini REST API
 */
export async function generateGeminiCompletion(
  messages: GeminiChatMessage[],
  options: {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: any[];
  }
): Promise<{
  response: string;
  tokens: number;
  model: string;
  function_call?: {
    name: string;
    arguments: string;
    original_parts?: any[];
  };
}> {
  const modelId = options.model || 'gemini-1.5-flash';

  // Separate system instruction from conversation messages
  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  // Build the system instruction from all system messages
  const systemInstruction = systemMessages.map((m) => m.content).join('\n');

  // Build the contents array for Gemini
  const contents = conversationMessages.map((m) => {
    const parts: any[] = [];
    
    if (m.role === 'function') {
      parts.push({
        functionResponse: {
          name: m.name,
          response: { content: m.content }
        }
      });
    } else if (m.function_call) {
      if (m.function_call.original_parts && m.function_call.original_parts.length > 0) {
        // Essential for Gemini 3: Preserve thought_signature and thought parts completely
        parts.push(...m.function_call.original_parts);
      } else {
        parts.push({
          functionCall: {
            name: m.function_call.name,
            args: JSON.parse(m.function_call.arguments || '{}')
          }
        });
      }
    } else {
      parts.push({ text: m.content });
    }

    return {
      role: m.role === 'assistant' || m.role === 'function' ? 'model' : 'user',
      parts,
    };
  });

  // Ensure the conversation starts with a user message (Gemini requirement)
  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  console.log(`🔮 Calling Google Gemini (${modelId})...`);

  // Build the request body
  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2000,
    },
  };

  // Add system instruction if present
  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  // Add tools if provided
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = [{
      function_declarations: options.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    }];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${options.apiKey}`;

  const fetchResponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!fetchResponse.ok) {
    const errorData = await fetchResponse.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`;
    throw new Error(
      `[GoogleGenerativeAI Error]: ${errorMessage}`
    );
  }

  const data = await fetchResponse.json();

  // Extract text from response
  const firstCandidate = data.candidates?.[0];
  const firstPart = firstCandidate?.content?.parts?.[0];
  
  let text = '';
  let function_call: any = undefined;

  // Search for a functionCall part in case it's not the first one (e.g. after a thought part)
  const functionCallPart = firstCandidate?.content?.parts?.find((p: any) => p.functionCall);

  if (functionCallPart) {
    function_call = {
      name: functionCallPart.functionCall.name,
      arguments: JSON.stringify(functionCallPart.functionCall.args || {}),
      original_parts: firstCandidate?.content?.parts // Preserve ALL parts (including thought_signature)
    };
  } else {
    text = firstCandidate?.content?.parts
      ?.map((p: any) => p.text || '')
      .join('') || '';
  }

  // Extract token usage
  const usageMetadata = data.usageMetadata;
  const totalTokens =
    usageMetadata?.totalTokenCount ||
    Math.ceil(
      (messages.reduce((s, m) => s + m.content.length, 0) + text.length) / 4
    );

  console.log(`✅ Gemini response received (${totalTokens} tokens)`);

  return {
    response: text,
    tokens: totalTokens,
    model: modelId,
    function_call
  };
}
