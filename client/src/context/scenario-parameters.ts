import type { Message } from './chat-types';

// Scenario parameters for chat API
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
  messages: Message[];
  parameters?: ScenarioParameters;
}
