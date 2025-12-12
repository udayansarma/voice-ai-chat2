/**
 * Realtime API WebSocket Route
 * 
 * This route provides WebSocket endpoints for Azure OpenAI Realtime API conversations.
 * It acts as a proxy/bridge between the client and Azure OpenAI, handling:
 * - Session management
 * - Audio streaming (bidirectional)
 * - Event routing
 * - Error handling
 * 
 * Endpoint: ws://localhost:5000/api/realtime/session
 */

import { Router } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createRealtimeSession, type RealtimeSessionConfig } from '../services/realtimeService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Store active sessions
const activeSessions = new Map<string, any>();

/**
 * Initialize WebSocket server for realtime conversations
 * This should be called from index.ts with the HTTP server instance
 */
export function initializeRealtimeWebSocket(server: any): void {
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/api/realtime/session',
    // Disable perMessageDeflate as required for Azure App Service Linux
    // See: https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux
    perMessageDeflate: false
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (request: any, socket: any, head: any) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;
    
    if (pathname === '/api/realtime/session') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      console.log(`[Realtime] Rejected upgrade for path: ${pathname}`);
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket, request: any) => {
    const sessionId = uuidv4();
    console.log(`[Realtime] New client connection: ${sessionId}`);

    try {
      // Parse session config from query parameters or initial message
      const url = new URL(request.url, `http://${request.headers.host}`);
      const voice = url.searchParams.get('voice') || 'alloy';
      const temperature = parseFloat(url.searchParams.get('temperature') || '0.8');

      const sessionConfig: RealtimeSessionConfig = {
        voice,
        temperature
      };

      // Create realtime session
      const realtimeSession = createRealtimeSession(sessionId, sessionConfig);
      activeSessions.set(sessionId, realtimeSession);

      // Connect to Azure OpenAI Realtime API
      const azureWs = await realtimeSession.connect();

      // Forward messages from client to Azure
      clientWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`[Realtime] Client → Azure:`, message.type || 'unknown');

          // Handle special client messages
          if (message.type === 'session.update') {
            // Client wants to update session config (e.g., system instructions, scenario)
            if (message.parameters) {
              sessionConfig.parameters = message.parameters;
              // Update session with new parameters asynchronously
              realtimeSession.updateSessionParameters(message.parameters).catch(err => {
                console.error('[Realtime] Failed to update session parameters:', err);
              });
            } else {
              // Forward session.update without parameters
              realtimeSession.sendEvent(message);
            }
          } else if (message.type === 'input_audio_buffer.append') {
            // Forward audio data
            realtimeSession.sendAudio(message.audio);
          } else if (message.type === 'input_audio_buffer.commit') {
            realtimeSession.commitAudio();
          } else if (message.type === 'conversation.item.create') {
            realtimeSession.sendEvent(message);
          } else if (message.type === 'response.create') {
            realtimeSession.sendEvent(message);
          } else if (message.type === 'response.cancel') {
            realtimeSession.interrupt();
          } else if (message.type === 'conversation.item.truncate') {
            console.log('[Realtime] Client → Azure: conversation.item.truncate');
            // Forward truncate event to Azure for proper server-side transcript sync
            realtimeSession.sendEvent(message);
          } else {
            // Forward other events as-is
            realtimeSession.sendEvent(message);
          }
        } catch (error) {
          console.error('[Realtime] Error parsing client message:', error);
          clientWs.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });

      // Forward messages from Azure to client
      azureWs.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Log important events
          const loggedTypes = [
            'session.created', 'session.updated',
            'conversation.item.created', 'conversation.item.input_audio_transcription.completed',
            'response.created', 'response.done', 
            'response.audio.delta', 'response.audio.done',
            'response.audio_transcript.delta', 'response.audio_transcript.done',
            'error'
          ];
          
          if (loggedTypes.includes(message.type)) {
            const logMsg = message.type === 'response.audio.delta' 
              ? `${message.type} (${message.delta?.length || 0} chars)`
              : message.type === 'error'
              ? `${message.type} - ${JSON.stringify(message.error)}`
              : message.type;
            console.log(`[Realtime] Azure → Client: ${logMsg}`);
          }

          // Forward to client as text (not binary)
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(data.toString('utf-8'));
          }
        } catch (error) {
          console.error('[Realtime] Error processing Azure message:', error);
        }
      });

      // Handle Azure WebSocket errors
      azureWs.on('error', (error) => {
        console.error('[Realtime] Azure WebSocket error:', error);
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            error: 'Azure OpenAI connection error'
          }));
        }
      });

      // Handle Azure WebSocket close
      azureWs.on('close', () => {
        console.log('[Realtime] Azure WebSocket closed');
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.close();
        }
        activeSessions.delete(sessionId);
      });

      // Handle client disconnect
      clientWs.on('close', () => {
        console.log(`[Realtime] Client disconnected: ${sessionId}`);
        realtimeSession.close();
        activeSessions.delete(sessionId);
      });

      clientWs.on('error', (error) => {
        console.error('[Realtime] Client WebSocket error:', error);
        realtimeSession.close();
        activeSessions.delete(sessionId);
      });

      // Send initial connection success
      clientWs.send(JSON.stringify({
        type: 'connection.established',
        session_id: sessionId
      }));

    } catch (error) {
      console.error('[Realtime] Error establishing session:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Failed to establish session'
        }));
        clientWs.close();
      }
      activeSessions.delete(sessionId);
    }
  });

  console.log('[Realtime] WebSocket server initialized at /api/realtime/session');
}

// HTTP endpoint to check active sessions (for debugging)
router.get('/sessions', (_req, res) => {
  res.json({
    active_sessions: activeSessions.size,
    session_ids: Array.from(activeSessions.keys())
  });
});

export default router;
