import React, { useState, useEffect } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useChat } from '../context/ChatContext';
import type { ConversationData, ConversationMessage } from '../context/evaluation-types';
import './EvaluationPanel.css';

interface EvaluationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const EvaluationPanel: React.FC<EvaluationPanelProps> = ({ isOpen, onClose }) => {
  const { 
    isEvaluating, 
    lastEvaluation, 
    connectionStatus, 
    evaluationProgress, 
    error,
    evaluateConversation,
    testConnection,
    clearEvaluation,
    clearError 
  } = useEvaluation();
  
  const { messages } = useChat();
  const [hasTestedConnection, setHasTestedConnection] = useState(false);

  // Test connection on first open
  useEffect(() => {
    if (isOpen && !hasTestedConnection) {
      testConnection();
      setHasTestedConnection(true);
    }
  }, [isOpen, hasTestedConnection, testConnection]);

  const handleEvaluateConversation = async () => {
    if (messages.length === 0) {
      return;
    }    // Convert chat messages to evaluation format (exclude system messages)
    const conversationMessages: ConversationMessage[] = messages
      .filter(msg => msg.role !== 'system') // Exclude system messages from evaluation
      .map(msg => ({
        role: msg.role as 'user' | 'assistant', // Safe cast since we filtered out 'system'
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
      }));

    const conversationData: ConversationData = {
      conversationId: `conversation-${Date.now()}`,
      messages: conversationMessages,
      metadata: {
        sessionDuration: messages.length > 0 ? 
          (new Date().getTime() - new Date(messages[0].timestamp || Date.now()).getTime()) / 1000 : 0,
        context: 'Voice AI Chat Session'
      }
    };

    await evaluateConversation(conversationData);
  };

  const renderMarkdown = (markdown: string) => {
    // Simple markdown rendering for basic formatting
    // For production, consider using a proper markdown library like react-markdown
    return markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\| (.*) \|$/gm, '<tr><td>$1</td></tr>')
      .replace(/\n/g, '<br>');
  };

  if (!isOpen) return null;

  return (
    <div className="evaluation-panel-overlay">
      <div className="evaluation-panel">
        <div className="evaluation-panel-header">
          <h2>Agent Evaluation</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close evaluation panel"
          >
            ×
          </button>
        </div>

        <div className="evaluation-panel-content">
          {/* Connection Status */}
          <div className="connection-status">
            <h3>Service Status</h3>
            {connectionStatus ? (
              <div className={`status-indicator ${connectionStatus.connected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                <span>
                  {connectionStatus.connected ? 'Connected' : 'Mock Mode'} - {connectionStatus.service}
                </span>
                {connectionStatus.error && (
                  <div className="status-error">Error: {connectionStatus.error}</div>
                )}
              </div>
            ) : (
              <div className="status-indicator loading">
                <span className="status-dot"></span>
                <span>Testing connection...</span>
              </div>
            )}
          </div>

          {/* Evaluation Controls */}
          <div className="evaluation-controls">
            <h3>Conversation Analysis</h3>
            <div className="controls-row">
              <button
                className="evaluate-button"
                onClick={handleEvaluateConversation}
                disabled={isEvaluating || messages.length === 0}
              >
                {isEvaluating ? 'Analyzing...' : 'Evaluate Conversation'}
              </button>
              <button
                className="clear-button"
                onClick={clearEvaluation}
                disabled={!lastEvaluation}
              >
                Clear Results
              </button>
            </div>
            
            {messages.length === 0 && (
              <p className="no-messages-notice">
                Start a conversation to enable evaluation.
              </p>
            )}
          </div>

          {/* Progress Indicator */}
          {evaluationProgress && (
            <div className="evaluation-progress">
              <div className="progress-header">
                <span className="progress-stage">{evaluationProgress.stage}</span>
                <span className="progress-percentage">{evaluationProgress.percentage}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${evaluationProgress.percentage}%` }}
                ></div>
              </div>
              <div className="progress-message">{evaluationProgress.message}</div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="evaluation-error">
              <h3>Evaluation Error</h3>
              <div className="error-content">
                <p>{error}</p>
                <button className="clear-error-button" onClick={clearError}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Evaluation Results */}
          {lastEvaluation && (
            <div className="evaluation-results">
              <h3>Evaluation Report</h3>
              <div className="results-header">
                <div className="result-meta">
                  <span>Generated: {new Date(lastEvaluation.timestamp).toLocaleString()}</span>
                  <span>Thread ID: {lastEvaluation.threadId}</span>
                </div>
              </div>
              <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ 
                  __html: renderMarkdown(lastEvaluation.markdown) 
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationPanel;
