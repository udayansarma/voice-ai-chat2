import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env';
import OpenAI from 'openai';
import http from 'http';
// Use require for speech SDK to bypass missing type declarations
const sdk: any = require('microsoft-cognitiveservices-speech-sdk');
import { errorHandler } from './middleware/errorHandler';
import { databaseServiceFactory } from './services/database-service-factory';
import personasRouter from './routes/personas';
import templatesRouter from './routes/templates';
import chatRouter from './routes/chat';
import speechRouter from './routes/speech';
import statsRouter from './routes/stats';
import tokenRouter from './routes/token';
import scenariosRouter from './routes/scenarios';
import moodsRouter from './routes/moods';
import realtimeRouter, { initializeRealtimeWebSocket } from './routes/realtime';
import { ConversationData, EvaluationResult } from './services/OpenAIEvaluationService';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/authMiddleware';
import { rateLimitMiddleware } from './middleware/rateLimitMiddleware';
import authRouter from './routes/auth';

const app: Express = express();
const PORT = config.port;

// Middleware
// Allow any origin (dev) and include credentials for cookies
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Log all incoming requests for debugging (can be removed in production)
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// Register personas router first
app.use('/api/personas', personasRouter);

// Initialize OpenAI client
let openai: OpenAI | null = null;

if (config.azureOpenAiEndpoint && config.azureOpenAiKey) {
  openai = new OpenAI({
    apiKey: config.azureOpenAiKey,
    baseURL: `${config.azureOpenAiEndpoint}/openai/deployments/${config.azureOpenAiDeployment}`,
    defaultQuery: { 'api-version': '2023-05-15' },
    defaultHeaders: { 'api-key': config.azureOpenAiKey },
  });
}

// Azure Speech Service Configuration
const AZURE_SPEECH_KEY = 'your-azure-speech-key';
const AZURE_SPEECH_REGION = 'your-azure-speech-region'; // e.g., 'eastus'

// Note: Replace these values with your actual Azure Speech Service credentials

// Azure TTS Configuration
const speechConfig = sdk.SpeechConfig.fromSubscription(
  config.azureSpeechKey,
  config.azureSpeechRegion
);

// Set the voice name (you can change this to a different voice if needed)
speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';

// Set the output format to 24KHz audio
speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3;

// Health check endpoints (/api/health existing + lightweight /healthz for platform checks)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});
app.get('/healthz', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Runtime configuration endpoint (Option 2)
// Returns values that can change at App Service setting level without rebuilding the client.
// apiBaseUrl can be overridden via APP setting API_BASE_URL; defaults to this server's base + '/api'.
app.get('/runtime-config', (req: Request, res: Response) => {
  const host = req.get('host');
  const protocolHeader = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const selfBase = `${protocolHeader}://${host}`;
  const apiBaseEnv = process.env.API_BASE_URL || process.env.VITE_API_URL; // allow reuse of existing var if set
  const apiBaseUrl = apiBaseEnv || `${selfBase}/api`;
  res.setHeader('Cache-Control', 'no-store, must-revalidate');
  res.json({ apiBaseUrl, updatedAt: new Date().toISOString() });
});

// Register authentication routes (login/logout/status)
app.use('/api/auth', authRouter);
// Public speech token endpoint (no auth required)
app.use('/api/speech/token', tokenRouter);

// Apply authentication and rate limiting to all subsequent routes
app.use(authMiddleware);
app.use(rateLimitMiddleware);

// Register routes
app.use('/api/templates', templatesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/speech', speechRouter);
app.use('/api/stats', statsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/moods', moodsRouter);
app.use('/api/realtime', realtimeRouter);

// Evaluation endpoints - inline implementation
import { OpenAIEvaluationService } from './services/OpenAIEvaluationService';
const evaluationService = new OpenAIEvaluationService();

// POST /api/evaluation/analyze-simple - Simple JSON response version
app.post('/api/evaluation/analyze-simple', async (req: any, res: any) => {
  console.log('Evaluation request received:', { timestamp: new Date().toISOString() });
  try {
    const conversationData: ConversationData = req.body;
    console.log('Conversation data:', { messageCount: conversationData.messages.length, metadataKeys: Object.keys(conversationData.metadata || {}) });

    // Validate the request body
    if (!conversationData || !conversationData.messages || !Array.isArray(conversationData.messages)) {
      return res.status(400).json({
        error: 'Invalid request body. Expected ConversationData with messages array.'
      });
    }

    if (conversationData.messages.length === 0) {
      return res.status(400).json({
        error: 'Conversation must contain at least one message.'
      });
    }

    const invalidMessage = conversationData.messages.find((msg: any) => 
      !msg.role || !msg.content || !msg.timestamp ||
      !['user', 'assistant'].includes(msg.role)
    );

    if (invalidMessage) {
      return res.status(400).json({
        error: 'Invalid message format. Each message must have role, content, and timestamp.'
      });
    }

    // Run evaluation without progress updates
    const result: EvaluationResult = await evaluationService.evaluateConversation(conversationData);
    console.log('Evaluation result:', { runId: result.runId, threadId: result.threadId, timestamp: result.timestamp });

    res.json({
      success: true,
      result
    });

  } catch (error: any) {
    console.error('Simple evaluation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Evaluation failed'
    });
  }
});

// GET /api/evaluation/test - Test the Azure AI Agent connection
app.get('/api/evaluation/test', async (req: any, res: any) => {
  try {
    // Removed: const isConnected = await evaluationService.testConnection();
    
    res.json({
      connected: true,
      service: 'Azure AI Agent Service',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Connection test error:', error);
    res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
      service: 'Azure AI Agent Service',
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Initialize database service and start server
async function startServer() {
  try {
    console.log('🚀 Starting Voice AI Chat Server...');
    
    // Configure database service based on environment
    databaseServiceFactory.configure({
      useDatabaseByDefault: true,
      fallbackToFiles: true,
      // Precedence: SQLITE_DB_PATH > DATABASE_PATH (legacy) > factory default
      dbPath: process.env.SQLITE_DB_PATH || process.env.DATABASE_PATH || databaseServiceFactory.getConfiguredPath()
    });
      // Initialize database service
    console.log('🔧 Initializing database service...');
    
    // Check for seed data mode environment variable
    const USE_SEED_DATA_MODE = process.env.USE_SEED_DATA_MODE === 'true';
    
    if (USE_SEED_DATA_MODE) {
      console.log('🌱 Using seed data mode (no file watchers)');
      await databaseServiceFactory.initializeDatabaseWithSeedData();
    } else {
      console.log('👀 Using file watching mode (current default)');
      await databaseServiceFactory.initializeDatabase();
    }
    
    if (databaseServiceFactory.isDatabaseReady()) {
      const modeStr = USE_SEED_DATA_MODE ? 'seed data mode' : 'file watching mode';
      console.log(`✅ Database service ready - using database storage (${modeStr})`);
      
      // Log DocumentService availability
      const docService = databaseServiceFactory.getDocumentService();
      if (docService) {
        console.log('📋 DocumentService available - CRUD operations enabled');
      }
    } else {
      console.log('⚠️  Database service failed - using file-based fallback');
      const error = databaseServiceFactory.getInitializationError();
      if (error) {
        console.log(`   Error: ${error.message}`);
      }
    }
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Initialize Realtime WebSocket
    initializeRealtimeWebSocket(server);
    
    // Start the Express server
    server.listen(PORT, () => {
      console.log(`\n🎉 Server is running on port ${PORT}`);
      console.log(`OpenAI client initialized: ${!!openai}`);
      console.log(`Azure Speech config initialized: ${!!speechConfig}`);
      console.log(`Database service status: ${databaseServiceFactory.isDatabaseReady() ? 'Ready' : 'Fallback mode'}`);
      console.log(`\n📊 Server ready for requests!`);
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Graceful shutdown initiated...');
  
  try {
    await databaseServiceFactory.close();
    console.log('✅ Database service closed');
  } catch (error) {
    console.error('❌ Error closing database service:', error);
  }
  
  console.log('👋 Server shut down successfully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  
  try {
    await databaseServiceFactory.close();
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  
  process.exit(0);
});

// Start the server
startServer();
