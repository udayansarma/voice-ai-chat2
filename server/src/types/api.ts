// Shared API types for server

export interface Persona {
  id: string;
  name: string;
  demographics?: Record<string, any>;
  behavior?: string;
  needs?: string;
  painpoints?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export interface Mood {
  id: string;
  mood: string;
  description?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ScenarioParameters {
  persona: string;
  mood: string;
  name: string;
  gender?: 'male' | 'female';
  voice: string;
  templateName?: string;
  scenarioId?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  parameters?: ScenarioParameters;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Stats {
  llmTokenCount: number;
  speechDurationSeconds: number;
  audioCharacterCount: number;
}

export interface Scenario {
  id: string;
  title: string;
  scenario: {
    description: string;
    context: {
      device?: string;
      service?: string;
      environment?: string;
      prior_actions?: string[];
      [key: string]: unknown;
    };
  };
  exit_criteria: {
    description: string;
    customer_exit_signals: string[];
  };
  evaluation_criteria: {
    identity_validation?: string[];
    troubleshooting_steps?: string[];
    resolution_confirmation?: string[];
    [key: string]: unknown;
  };
  scenario_type: string;
  difficulty_level?: string;
  expected_duration_seconds?: number;
  version?: string;
  [key: string]: unknown;
}
