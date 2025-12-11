// Types for agent evaluation functionality
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ConversationData {
  conversationId: string;
  messages: ConversationMessage[];
  metadata?: {
    sessionDuration?: number;
    userSatisfaction?: number;
    context?: string;
    [key: string]: any;
  };
}

export interface EvaluationResult {
  markdown: string;
  threadId: string;
  runId: string;
  timestamp: string;
}

export interface EvaluationResponse {
  success: boolean;
  result?: EvaluationResult;
  error?: string;
}

export interface EvaluationProgress {
  stage: 'preparing' | 'analyzing' | 'generating' | 'complete' | 'error';
  message: string;
  percentage: number;
}

export interface ConnectionStatus {
  connected: boolean;
  service: string;
  timestamp: string;
  error?: string;
}
