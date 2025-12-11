import { TemplateManager } from '../prompts/templateManager';
import OpenAI from 'openai';
// Removed invalid SDK type import; using local types instead
import { config } from '../config/env';
import statsService from './statsService';
import type { ScenarioParameters } from '../types/api';

let openai: OpenAI | null = null;
if (config.azureOpenAiEndpoint && config.azureOpenAiKey) {
  openai = new OpenAI({
    apiKey: config.azureOpenAiKey,
    baseURL: `${config.azureOpenAiEndpoint}/openai/deployments/${config.azureOpenAiDeployment}`,
    defaultQuery: { 'api-version': '2023-05-15' },
    defaultHeaders: { 'api-key': config.azureOpenAiKey },
  });
}

export async function getChatCompletion(messages: any[], statsSvc = statsService, parameters?: ScenarioParameters): Promise<any> {
  if (!openai) throw new Error('OpenAI client not initialized');
  // Local type for message payload
  type ChatMessagePayload = { role: 'system' | 'user' | 'assistant'; content: string };

  // Separate client-supplied system prompts and non-system messages
  const systemMessagesRaw = messages.filter(m => m.role === 'system');
  const nonSystemMessagesRaw = messages.filter(m => m.role !== 'system');
  const windowedNonSystemRaw = nonSystemMessagesRaw.slice(-config.messageWindowSize);
  
  // Map to SDK message param type
  // Map to local typed payloads
  const systemMessages: ChatMessagePayload[] = systemMessagesRaw.map(m => ({ role: m.role, content: m.content }));
  const windowedNonSystem: ChatMessagePayload[] = windowedNonSystemRaw.map(m => ({ role: m.role, content: m.content }));
  // Build the final messages array for OpenAI, preferring client system prompts
  // Build final array of messages, using our local type
  let messagesForOpenAi: ChatMessagePayload[];
  if (systemMessages.length > 0) {
    messagesForOpenAi = [...systemMessages, ...windowedNonSystem];
  } else {
    // Fallback to server-side template selection if none provided
    const { systemMessage, configuration } = await TemplateManager.getContextualPrompt(messages, parameters);
    const fallbackSystemMsg: ChatMessagePayload = { role: 'system', content: systemMessage };
    messagesForOpenAi = [fallbackSystemMsg, ...windowedNonSystem];
  }

  try {
    // Cast at API boundary to satisfy SDK types
    const completion = await openai.chat.completions.create({
      model: config.azureOpenAiModel,
      messages: messagesForOpenAi as any,
    });
    // Record token usage
    if (completion.usage?.total_tokens) {
      statsSvc.recordTokens(completion.usage.total_tokens);
    }
    return { ...completion.choices[0].message, usage: completion.usage };
  } catch (error) {
    const retryCompletion = await openai.chat.completions.create({
      model: config.azureOpenAiModel,
      messages: messagesForOpenAi as any,
    });
    if (retryCompletion.usage?.total_tokens) {
      statsSvc.recordTokens(retryCompletion.usage.total_tokens);
    }
    return { ...retryCompletion.choices[0].message, usage: retryCompletion.usage };
  }
 }
