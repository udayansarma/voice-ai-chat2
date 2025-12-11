// Utility functions for ExportDialog
import type { ConversationData, ConversationMessage } from '../context/evaluation-types';

/**
 * Copies the provided text to the clipboard and returns a promise that resolves on success.
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * Converts export messages to evaluation format and returns ConversationData.
 */
export function buildConversationData(exportData: any): ConversationData | null {
  if (!exportData?.conversation?.messages) return null;
  const conversationMessages: ConversationMessage[] = exportData.conversation.messages
    .filter((msg: any) => msg.role !== 'system')
    .map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: new Date(msg.timestamp || Date.now()).toISOString(),
    }));
  return {
    conversationId: exportData.conversationId || `conversation-${Date.now()}`,
    messages: conversationMessages,
    metadata: {
      sessionDuration: exportData.performance?.conversationDurationMs
        ? Math.floor(exportData.performance.conversationDurationMs / 1000)
        : undefined,
      context: 'Exported conversation evaluation',
      ...exportData.context,
    },
  };
}

/**
 * Formats duration in ms to mm:ss string.
 */
export function formatDuration(durationMs: number, hasUserMessages: boolean): string {
  if (!hasUserMessages) return '0:00';
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
