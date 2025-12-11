import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  ConversationData,
  EvaluationResult,
  EvaluationResponse,
  EvaluationProgress,
  ConnectionStatus
} from './evaluation-types';
import apiClient from '../utils/apiClient';

interface EvaluationContextType {
  // State
  isEvaluating: boolean;
  lastEvaluation: EvaluationResult | null;
  connectionStatus: ConnectionStatus | null;
  evaluationProgress: EvaluationProgress | null;
  error: string | null;

  // Actions
  evaluateConversation: (conversationData: ConversationData) => Promise<EvaluationResult | null>;
  testConnection: () => Promise<boolean>;
  clearEvaluation: () => void;
  clearError: () => void;
}

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined);

export const useEvaluation = (): EvaluationContextType => {
  const context = useContext(EvaluationContext);
  if (!context) {
    throw new Error('useEvaluation must be used within an EvaluationProvider');
  }
  return context;
};

interface EvaluationProviderProps {
  children: React.ReactNode;
}

export const EvaluationProvider: React.FC<EvaluationProviderProps> = ({ children }) => {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<EvaluationResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [evaluationProgress, setEvaluationProgress] = useState<EvaluationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluateConversation = useCallback(async (conversationData: ConversationData): Promise<EvaluationResult | null> => {
    setIsEvaluating(true);
    setError(null);
    setLastEvaluation(null);
    setEvaluationProgress({
      stage: 'preparing',
      message: 'Preparing conversation data for evaluation...',
      percentage: 0
    });

    try {
      // Update progress
      setEvaluationProgress({
        stage: 'analyzing',
        message: 'Analyzing conversation with Azure AI Agent...',
        percentage: 25
      });

      const response = await apiClient.post('/api/evaluation/analyze-simple', conversationData);

      setEvaluationProgress({
        stage: 'generating',
        message: 'Generating evaluation report...',
        percentage: 75
      });

      const data: EvaluationResponse = response.data;

      if (!data.success || !data.result) {
        throw new Error(data.error || 'Evaluation failed');
      }

      setEvaluationProgress({
        stage: 'complete',
        message: 'Evaluation complete!',
        percentage: 100
      });

      setLastEvaluation(data.result);
      
      // Clear progress after a short delay
      setTimeout(() => {
        setEvaluationProgress(null);
      }, 2000);

      return data.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Evaluation failed';
      setError(errorMessage);
      setEvaluationProgress({
        stage: 'error',
        message: `Error: ${errorMessage}`,
        percentage: 0
      });
      
      // Clear progress after a short delay
      setTimeout(() => {
        setEvaluationProgress(null);
      }, 3000);
      
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, []);
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.get('/api/evaluation/test');
      
      const data: ConnectionStatus = response.data;
      setConnectionStatus(data);
      return data.connected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setConnectionStatus({
        connected: false,
        service: 'Azure AI Agent Service',
        timestamp: new Date().toISOString(),
        error: errorMessage
      });
      return false;
    }
  }, []);

  const clearEvaluation = useCallback(() => {
    setLastEvaluation(null);
    setEvaluationProgress(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: EvaluationContextType = {
    isEvaluating,
    lastEvaluation,
    connectionStatus,
    evaluationProgress,
    error,
    evaluateConversation,
    testConnection,
    clearEvaluation,
    clearError,
  };

  return (
    <EvaluationContext.Provider value={value}>
      {children}
    </EvaluationContext.Provider>
  );
};
