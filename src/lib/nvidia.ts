import { JARVIS_CONFIG } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

// Délais exponentiels pour gestion des quotas et rate limits
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callNvidiaChat(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<{ content: string; modelUsed: string }> {
  const primaryModel = options.model || JARVIS_CONFIG.defaultReasoningModel;
  const fallbackModel = JARVIS_CONFIG.defaultFastModel;

  const modelsToTry = [primaryModel];
  if (primaryModel !== fallbackModel) {
    modelsToTry.push(fallbackModel);
  }

  let lastError: Error | null = null;

  for (const currentModel of modelsToTry) {
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${NVIDIA_API_KEY}`,
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            temperature: options.temperature ?? 0.3,
            max_tokens: options.max_tokens ?? 2048,
          }),
        });

        if (response.status === 429 || response.status === 503) {
          console.warn(`[NVIDIA] Status ${response.status} sur ${currentModel}. Attente de ${delay}ms...`);
          await sleep(delay);
          delay *= 2;
          retries--;
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`NVIDIA API Error [${response.status}]: ${errText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        return { content, modelUsed: currentModel };
      } catch (err: any) {
        lastError = err;
        retries--;
        if (retries > 0) {
          await sleep(delay);
          delay *= 2;
        }
      }
    }
  }

  throw lastError || new Error('Échec des appels NVIDIA NIM');
}

export async function createNvidiaStream(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const model = options.model || JARVIS_CONFIG.defaultFastModel;

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 3000,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`NVIDIA Streaming Error [${response.status}]: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Corps de réponse vide de l\'API NVIDIA');
  }

  return response.body;
}
