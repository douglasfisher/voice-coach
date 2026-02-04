/**
 * Shared types for AI service edge functions
 */

// =============================================================================
// GROQ API TYPES
// =============================================================================

export type GroqModel =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'llama-guard-3-8b'
  | 'mixtral-8x7b-32768'
  | 'gemma2-9b-it';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionSettings {
  model: GroqModel;
  temperature?: number;      // 0-2, default 1
  top_p?: number;            // 0-1, default 1
  max_completion_tokens?: number;
  stop?: string[];           // Up to 4 sequences
  stream?: boolean;
}

export interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// AI SERVICE TYPES
// =============================================================================

export type AITaskType = 'chat' | 'analyze' | 'summarize' | 'transform';

export interface AITaskRequest {
  task: AITaskType;
  personaId?: string;
  systemPrompt?: string;      // Override or custom system prompt
  userPrompt: string;
  context?: GroqMessage[];    // Conversation history
  settings?: Partial<GroqCompletionSettings>;
  responseFormat?: 'text' | 'json';
}

export interface AITaskResponse {
  success: boolean;
  content: string;
  parsed?: unknown;           // Parsed JSON if responseFormat is 'json'
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

// =============================================================================
// PERSONA TYPES
// =============================================================================

export type ChallengeStyle =
  | 'socratic'
  | 'devils_advocate'
  | 'steelman'
  | 'empathetic_probe'
  | 'logical_surgeon'
  | 'perspective_shifter';

export interface PersonaSettings {
  model: GroqModel;
  temperature: number;
  top_p: number;
  max_completion_tokens: number;
}

export interface PersonaPromptConfig {
  id: string;
  name: string;
  challengeStyle: ChallengeStyle;
  systemPrompt: string;
  settings: PersonaSettings;
  /**
   * Template variables that can be injected into prompts
   * e.g., {userName}, {topic}, {conversationTurn}
   */
  promptVariables?: Record<string, string>;
}

// =============================================================================
// ANALYSIS TYPES
// =============================================================================

export type AnalysisItemType =
  | 'fallacy'
  | 'bias'
  | 'gender_dynamic'
  | 'racial_assumption'
  | 'emotional'
  | 'strength';

export type AnalysisSeverity = 'minor' | 'moderate' | 'significant';

export interface AnalysisItem {
  type: AnalysisItemType;
  code: string;
  label: string;
  severity: AnalysisSeverity;
  excerpt: string;
  explanation: string;
  coaching: string;
}

export interface AnalysisResult {
  items: AnalysisItem[];
  overall_quality: number;
  encouragement: string;
}
