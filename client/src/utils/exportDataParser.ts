// Type guard and parser for export data

export interface ExportData {
  stats?: { totalTokensUsed?: number; totalDurationMs?: number };
  totalTokensUsed?: number;
  totalDurationMs?: number;
  conversation?: {
    messageCount?: number;
    messages?: Array<any>;
  };
  messageCount?: number;
  context?: any;
  evaluationCriteria?: any;
  performance?: { conversationDurationMs?: number };
  conversationId?: string;
}

export function isExportData(obj: unknown): obj is ExportData {
  if (!obj || typeof obj !== 'object') return false;
  // Basic shape check
  return (
    'conversation' in obj ||
    'stats' in obj ||
    'totalTokensUsed' in obj
  );
}

export function parseExportData(json: string | null): ExportData | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return isExportData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
