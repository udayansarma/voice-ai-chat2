import apiClient from './apiClient';
import type { ScenarioParameters } from '../context/scenario-parameters';

/**
 * Fetches an Azure Speech Service token from the backend.
 * Returns an object with { token, region } or throws on error.
 */
export interface SpeechTokenResponse {
  token: string;
  region: string;
}

export async function fetchSpeechToken(): Promise<SpeechTokenResponse> {
  const response = await apiClient.get('/api/speech/token');
  return response.data;
}

export async function fetchSubstitutedSystemPrompt(parameters: ScenarioParameters): Promise<string> {
  const response = await apiClient.post<{ systemPrompt: string }>('/api/chat/system-prompt', { parameters });
  return response.data.systemPrompt;
}