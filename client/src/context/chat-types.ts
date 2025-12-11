// Shared types for ChatContext
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  totalTokens: number;
  setTotalTokens: React.Dispatch<React.SetStateAction<number>>;
}

// Enhanced evaluation export types
export interface EvaluationExportData {
  exportTimestamp: number;
  conversationId: string;
  
  context: {
    persona?: {
      id: string;
      name: string;
      description?: string;
    } | null;
    scenario?: {
      id: string;
      name: string;
      description?: string;
    } | null;
    mood?: {
      mood: string;
      description?: string;
    } | null;
    template?: {
      id: string;
      name: string;
      systemPrompt: string;
    } | null;
    voice?: string | null;
    generatedName?: {
      full: string;
      gender?: string;
    } | null;
  };
  
  conversation: {
    messages: Message[];
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    systemMessageCount: number;
  };
  
  stats: {
    startTime: number;
    endTime: number;
    totalDurationMs: number;
    durationFormatted: string;
    totalTokensUsed: number;
    averageTokensPerMessage: number;
    serverStats?: {
      llmTokenCount: number;
      speechDurationSeconds: number;
      audioCharacterCount: number;
    } | null;
  };
    evaluationCriteria: {
    scenarioId?: string | null;
    personaId?: string | null;
    moodType?: string | null;
    evaluationNotes: string;
    suggestedEvaluationAreas: string[];
    scenarioDetails?: {
      title: string;
      description?: string;
      scenarioType: string;
      difficultyLevel?: string;
      expectedDurationSeconds?: number;
      exitCriteria?: {
        description: string;
        customer_exit_signals: string[];
      };
    } | null;
  };
}

// Legacy export format for backward compatibility
export interface LegacyExportData {
  messages: Message[];
  totalDurationMs: number;
  totalTokensUsed: number;
  messageCount: number;
}
