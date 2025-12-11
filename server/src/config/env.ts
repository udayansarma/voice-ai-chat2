// Only load .env in non-production environments for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

export const config = {
  port: process.env.PORT || 5000,
  azureOpenAiEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAiKey: process.env.AZURE_OPENAI_KEY,
  azureOpenAiDeployment: process.env.AZURE_OPENAI_DEPLOYMENT,
  azureOpenAiModel: process.env.AZURE_OPENAI_MODEL || 'gpt-4',
  azureSpeechKey: process.env.AZURE_SPEECH_KEY || 'your-azure-speech-key',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',
  // Azure OpenAI Realtime API configuration
  azureOpenAIRealtimeEndpoint: process.env.AZURE_OPENAI_REALTIME_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIRealtimeKey: process.env.AZURE_OPENAI_REALTIME_KEY || process.env.AZURE_OPENAI_KEY,
  azureOpenAIRealtimeDeployment: process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT || 'gpt-4o-realtime-preview',
  useRealtimeAPI: process.env.USE_REALTIME_API === 'true',
  // Azure AI Agent Service configuration
  azureAiFoundryProjectEndpoint: process.env.AZURE_AI_FOUNDRY_PROJECT_ENDPOINT,
  azureEvaluationAgentId: process.env.AZURE_EVALUATION_AGENT_ID,
  // Message window configuration
  // Ensure messageWindowSize is at least 20, parsing in base 10
  messageWindowSize: Math.max(parseInt(process.env.MESSAGE_WINDOW_SIZE || '20', 10), 20),
};

import { AuthConfig, AuthUser } from '../types/auth';

// Load authentication settings
const authUsersRaw = process.env.AUTH_USERS || '[]';
let authUsers: AuthUser[] = [];
try {
  authUsers = JSON.parse(authUsersRaw) as AuthUser[];
} catch {
  console.error('Invalid AUTH_USERS environment variable');
}

export const authConfig: AuthConfig = {
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionDurationHours: parseInt(process.env.SESSION_DURATION_HOURS || '4', 10),
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10),
  users: authUsers,
  enabled: process.env.AUTH_ENABLED === 'true',
};

// Log loaded users for debugging (can be removed in production)
console.log('🔑 Loaded AUTH_USERS:', authConfig.users);
