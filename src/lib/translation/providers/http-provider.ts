import type { ContentLanguage, TranslationProvider, TranslateContentRequest } from '../types';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MODEL = 'gpt-4o-mini';

function systemPrompt(): string {
  return [
    'You are a professional English-Urdu translator for a Pakistani retail application.',
    'Translate the user-provided text between English and Urdu.',
    'Rules:',
    '- Output ONLY the translated text. No quotes, no explanations, no extra words.',
    '- Preserve brand names, proper nouns, shop names and person names in a natural way.',
    '- Never modify numbers, prices, phone numbers, URLs, email addresses, SKUs, barcodes or technical codes; copy them verbatim.',
    '- Keep the meaning, tone and punctuation of the original message.',
    '- If the text mixes both languages, translate only the parts written in the source language.',
  ].join('\n');
}

function userPrompt(text: string, target: ContentLanguage): string {
  const direction = target === 'ur' ? 'from English to Urdu' : 'from Urdu to English';
  return `Translate the following text ${direction}:\n<<<\n${text}\n>>>`;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: unknown } }[];
}

/**
 * OpenAI-compatible HTTP translation provider.
 *
 * Configuration is read from environment variables only (never hardcoded):
 *   TRANSLATION_API_URL   — full chat-completions endpoint URL (required)
 *   TRANSLATION_API_KEY   — bearer token (required)
 *   TRANSLATION_MODEL     — model name (defaults to gpt-4o-mini)
 *   TRANSLATION_TIMEOUT_MS — request timeout (defaults to 15000)
 *
 * The provider swallows all transport failures and returns null so callers
 * can preserve the user's original content instead of failing the request.
 */
export class HttpTranslationProvider implements TranslationProvider {
  readonly name = 'http-openai-compatible';

  private readonly url: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.url = env.TRANSLATION_API_URL?.trim() || undefined;
    this.apiKey = env.TRANSLATION_API_KEY?.trim() || undefined;
    this.model = env.TRANSLATION_MODEL?.trim() || DEFAULT_MODEL;
    const parsedTimeout = Number(env.TRANSLATION_TIMEOUT_MS);
    this.timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.apiKey);
  }

  async translate(request: TranslateContentRequest): Promise<string | null> {
    if (!this.isConfigured() || !this.url || !this.apiKey) return null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt() },
            { role: 'user', content: userPrompt(request.text, request.targetLanguage) },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        console.error(`[translation] provider HTTP ${response.status}`);
        return null;
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const raw = payload.choices?.[0]?.message?.content;
      if (typeof raw !== 'string') return null;

      const cleaned = raw.trim().replace(/^["'«»]+|["'«»]+$/g, '').trim();
      return cleaned.length > 0 ? cleaned : null;
    } catch {
      return null;
    }
  }
}
