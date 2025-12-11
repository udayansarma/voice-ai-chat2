import { AIProjectClient } from '@azure/ai-projects';
import { DefaultAzureCredential } from '@azure/identity';
import { config } from '../config/env';

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
  };
}

export interface EvaluationProgress {
  status: 'starting' | 'analyzing' | 'generating' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export interface EvaluationResult {
  markdown: string;
  threadId?: string;
  runId?: string;
  timestamp: string;
}

export class AgentEvaluationService {
  private client: AIProjectClient | null;
  private agentId: string;

  constructor() {
    const endpoint = config.azureAiFoundryProjectEndpoint;
    const agentId = config.azureEvaluationAgentId;
    if (endpoint && agentId) {
      this.client = new AIProjectClient(endpoint, new DefaultAzureCredential());
      this.agentId = agentId;
    } else {
      this.client = null;
      this.agentId = 'mock-agent-id';
    }
  }

  async evaluateConversation(
    conversationData: ConversationData,
    onProgress?: (progress: EvaluationProgress) => void
  ): Promise<EvaluationResult> {
    if (!this.client) {
      const error = new Error('Azure AI Agent Service is not configured. Please set your project endpoint and agent ID.');
      onProgress?.({ status: 'error', message: error.message });
      throw error;
    }
    try {
      onProgress?.({ status: 'starting', message: 'Creating thread...', progress: 0 });
      const thread = await this.client.agents.threads.create();
      onProgress?.({ status: 'analyzing', message: 'Posting message...', progress: 20 });
      await this.client.agents.messages.create(
        thread.id,
        'user',
        this.formatConversationForAgent(conversationData)
      );
      onProgress?.({ status: 'generating', message: 'Running agent...', progress: 40 });
      let run = await this.client.agents.runs.create(
        thread.id,
        this.agentId,
        { additionalInstructions: this.getEvaluationInstructions() }
      );
      let attempts = 0;
      while ((run.status === 'in_progress' || run.status === 'queued') && attempts < 60) {
        await new Promise(res => setTimeout(res, 1000));
        run = await this.client.agents.runs.get(thread.id, run.id);
        onProgress?.({ status: 'generating', message: `Waiting for agent... (${run.status})`, progress: 50 + attempts });
        attempts++;
      }
      if (run.status !== 'completed') {
        throw new Error(`Agent run failed: ${run.status}`);
      }
      onProgress?.({ status: 'generating', message: 'Fetching result...', progress: 95 });
      const messagesIter = this.client.agents.messages.list(thread.id);
      const messages: any[] = [];
      for await (const msg of messagesIter) {
        messages.push(msg);
      }
      const evaluationMessage = messages.find((msg: any) => msg.role === 'assistant' && msg.content && msg.content.length > 0);
      if (!evaluationMessage?.content?.[0] || evaluationMessage.content[0].type !== 'text') {
        throw new Error('No evaluation response received from agent');
      }
      // Handle case where text may be an object with a 'value' field
      const rawText = (evaluationMessage.content[0] as any).text;
      const markdown = typeof rawText === 'string'
        ? rawText
        : (rawText && typeof rawText.value === 'string' ? rawText.value : String(rawText));
      onProgress?.({ status: 'complete', message: 'Evaluation complete!', progress: 100 });
      return { markdown, threadId: thread.id, runId: run.id, timestamp: new Date().toISOString() };
    } catch (error: any) {
      onProgress?.({ status: 'error', message: error.message || 'Evaluation failed' });
      throw error;
    }
  }

  private getEvaluationInstructions(): string {
    return `You are an expert conversation analyst specializing in voice AI chat interactions. Please provide a comprehensive evaluation of the provided conversation.

Format your response as a detailed Markdown report with the following sections:

# Conversation Evaluation Report

## Executive Summary
Provide a brief overview of the conversation quality, key findings, and overall assessment.

## Conversation Analysis

### Flow and Coherence
- Analyze how well the conversation flows from topic to topic
- Evaluate the logical progression and natural transitions
- Comment on any abrupt changes or disconnected elements

### Response Quality
- Assess the appropriateness and relevance of AI responses
- Evaluate helpfulness, accuracy, and clarity
- Note any responses that were particularly effective or problematic

### Engagement Level
- Analyze user engagement patterns throughout the conversation
- Evaluate the AI's ability to maintain user interest
- Comment on interactive elements and follow-up questions

## Strengths
List and explain the key strengths observed in this conversation, including:
- Effective communication patterns
- Well-handled topics or questions
- Successful engagement techniques

## Areas for Improvement
Provide specific, actionable recommendations for enhancing future conversations:
- Communication gaps or issues
- Missed opportunities for better responses
- Technical or content improvements needed

## Technical Observations
Comment on technical aspects such as:
- Response appropriateness and timing
- Handling of complex queries
- Any technical issues or limitations observed

## Overall Rating
Provide an overall quality rating (1-10 scale) with detailed justification for the score.

## Recommendations
Offer specific, actionable suggestions for improving similar conversations in the future.

Use proper Markdown formatting with headers, bullet points, bold text, and other formatting as appropriate. Be thorough but concise in your analysis.`;
  }

  private async mockEvaluate(
    conversationData: ConversationData,
    onProgress?: (progress: EvaluationProgress) => void
  ): Promise<EvaluationResult> {
    onProgress?.({ status: 'analyzing', message: 'Mock analyzing...', progress: 25 });
    await new Promise(res => setTimeout(res, 1000));
    onProgress?.({ status: 'complete', message: 'Mock evaluation complete!', progress: 100 });
    return {
      markdown: '# Mock Evaluation\n\nThis is a mock evaluation.',
      threadId: 'mock-thread',
      runId: 'mock-run',
      timestamp: new Date().toISOString()
    };
  }

  private formatConversationForAgent(data: ConversationData): string {
    let formatted = '# Conversation to Evaluate\n\n';
    if (data.metadata) {
      formatted += '## Conversation Metadata\n';
      if (data.metadata.persona) formatted += `- **Persona**: ${data.metadata.persona}\n`;
      if (data.metadata.scenario) formatted += `- **Scenario**: ${data.metadata.scenario}\n`;
      if (data.metadata.duration) formatted += `- **Duration**: ${Math.round(data.metadata.duration / 60)} minutes\n`;
      if (data.metadata.messageCount) formatted += `- **Messages**: ${data.metadata.messageCount}\n`;
      formatted += '\n';
    }
    formatted += '## Conversation Transcript\n\n';
    data.messages.forEach(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      formatted += `**${roleLabel}** (${timestamp}):\n${msg.content}\n\n`;
    });
    formatted += '\n---\n\nPlease provide a comprehensive evaluation of this conversation following the Markdown format guidelines.';
    return formatted;
  }
}