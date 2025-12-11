// Types for scenario parameter substitution
import type { ChatMessage } from './api';

export interface ScenarioParameters {
  persona: string;
  mood: string;
  name: string;
  voice: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  parameters?: ScenarioParameters;
}
