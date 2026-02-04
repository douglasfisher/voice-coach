/**
 * Groq API Client
 *
 * A lightweight, maintainable wrapper around the Groq API.
 * Follows Groq API best practices: https://console.groq.com/docs/api-reference
 */

import {
  GroqMessage,
  GroqCompletionSettings,
  GroqResponse,
  GroqModel,
} from './types.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Default settings optimized for conversational AI
const DEFAULT_SETTINGS: GroqCompletionSettings = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  top_p: 0.9,
  max_completion_tokens: 1024,
  stream: false,
};

export interface GroqClientConfig {
  apiKey: string;
  defaultModel?: GroqModel;
  defaultSettings?: Partial<GroqCompletionSettings>;
}

export class GroqClient {
  private apiKey: string;
  private defaultSettings: GroqCompletionSettings;

  constructor(config: GroqClientConfig) {
    this.apiKey = config.apiKey;
    this.defaultSettings = {
      ...DEFAULT_SETTINGS,
      ...config.defaultSettings,
      model: config.defaultModel || DEFAULT_SETTINGS.model,
    };
  }

  /**
   * Create a chat completion
   */
  async chat(
    messages: GroqMessage[],
    settings?: Partial<GroqCompletionSettings>
  ): Promise<GroqResponse> {
    const mergedSettings = {
      ...this.defaultSettings,
      ...settings,
    };

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mergedSettings.model,
        messages,
        temperature: mergedSettings.temperature,
        top_p: mergedSettings.top_p,
        max_tokens: mergedSettings.max_completion_tokens,
        stop: mergedSettings.stop,
        stream: false, // Streaming not supported in this implementation
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GroqError(
        `Groq API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return response.json();
  }

  /**
   * Simple completion with system + user prompts
   */
  async complete(
    systemPrompt: string,
    userPrompt: string,
    settings?: Partial<GroqCompletionSettings>
  ): Promise<string> {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chat(messages, settings);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Completion with conversation history
   */
  async completeWithHistory(
    systemPrompt: string,
    history: GroqMessage[],
    userPrompt: string,
    settings?: Partial<GroqCompletionSettings>
  ): Promise<string> {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chat(messages, settings);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Completion with conversation history - returns full response with usage
   */
  async completeWithHistoryAndUsage(
    systemPrompt: string,
    history: GroqMessage[],
    userPrompt: string,
    settings?: Partial<GroqCompletionSettings>
  ): Promise<{ content: string; usage: GroqResponse['usage'] }> {
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: userPrompt },
    ];

    const response = await this.chat(messages, settings);
    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage,
    };
  }

  /**
   * JSON-mode completion - instructs model to return valid JSON
   */
  async completeJSON<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    settings?: Partial<GroqCompletionSettings>
  ): Promise<{ content: string; parsed: T | null }> {
    // Enhance system prompt to enforce JSON output
    const jsonSystemPrompt = `${systemPrompt}

IMPORTANT: You must respond with valid JSON only. No markdown, no explanations, just the JSON object.`;

    const content = await this.complete(jsonSystemPrompt, userPrompt, {
      ...settings,
      temperature: settings?.temperature ?? 0.3, // Lower temp for structured output
    });

    // Try to parse JSON from response
    let parsed: T | null = null;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ||
        content.match(/\{[\s\S]*\}/);

      const jsonStr = jsonMatch
        ? (jsonMatch[1] || jsonMatch[0])
        : content;

      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.warn('Failed to parse JSON response:', content.slice(0, 200));
    }

    return { content, parsed };
  }
}

/**
 * Custom error class for Groq API errors
 */
export class GroqError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

/**
 * Create a Groq client from environment variables
 */
export function createGroqClient(
  settings?: Partial<GroqCompletionSettings>
): GroqClient {
  const apiKey = Deno.env.get('GROQ_API_KEY');

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  return new GroqClient({
    apiKey,
    defaultSettings: settings,
  });
}
