import OpenAI from 'openai';
import { config } from '../config/env';
import { PrompyLoader } from '../prompts/promptyLoader';
import * as path from 'path';

// Reuse existing types from agentEvaluationService.ts
export interface ConversationData {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  metadata?: {
    persona?: string;
    scenario?: string;
    duration?: number;
    messageCount?: number;
    [key: string]: any;
  };
}

export interface EvaluationResult {
  markdown: string;
  threadId: string;  // Will use 'openai-direct' for compatibility
  runId: string;     // Will use unique request ID
  timestamp: string;
}

export class OpenAIEvaluationService {
  private openai: OpenAI;

  constructor() {
    // Use the same Azure OpenAI configuration as the chat service
    if (!config.azureOpenAiEndpoint || !config.azureOpenAiKey) {
      throw new Error('Azure OpenAI configuration is required for evaluation service');
    }
    
    this.openai = new OpenAI({
      apiKey: config.azureOpenAiKey,
      baseURL: `${config.azureOpenAiEndpoint}/openai/deployments/${config.azureOpenAiDeployment}`,
      defaultQuery: { 'api-version': '2023-05-15' },
      defaultHeaders: { 'api-key': config.azureOpenAiKey },
    });
  }

  async evaluateConversation(conversationData: ConversationData): Promise<EvaluationResult> {
    const conversationText = this.formatConversationForEvaluation(conversationData);

    // Load prompty template from local file (not from global prompts directory)
    const templatePath = path.join(__dirname, 'conversation-evaluation.prompty');
    const { systemMessage, configuration } = PrompyLoader.loadTemplateFromPath(templatePath, {
      conversationText
    });

    const response = await this.openai.chat.completions.create({
      model: config.azureOpenAiModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: conversationText }
      ],
      temperature: configuration.temperature || 0.3,
      max_tokens: configuration.max_tokens || 2000,
    });

    const markdown = response.choices[0]?.message?.content || 'Evaluation failed - no response from OpenAI';
    
    // Return data matching existing interface expectations
    return {
      markdown,
      threadId: 'openai-direct',
      runId: `eval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  }

  private formatConversationForEvaluation(data: ConversationData): string {
    let formatted = 'CONVERSATION TO EVALUATE:\n\n';
    
    // Add metadata if available
    if (data.metadata) {
      formatted += 'CONVERSATION METADATA:\n';
      if (data.metadata.persona) formatted += `- **Persona**: ${data.metadata.persona}\n`;
      if (data.metadata.scenario) formatted += `- **Scenario**: ${data.metadata.scenario}\n`;
      if (data.metadata.duration) formatted += `- **Duration**: ${Math.round(data.metadata.duration / 60)} minutes\n`;
      if (data.metadata.messageCount) formatted += `- **Messages**: ${data.metadata.messageCount}\n`;
      formatted += '\n';
    }
    
    // Add conversation messages
    formatted += 'CONVERSATION TRANSCRIPT:\n\n';
    data.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const roleLabel = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      formatted += `**${roleLabel}** (${timestamp}):\n${msg.content}\n\n`;
    });
    
    return formatted;
  }
}
