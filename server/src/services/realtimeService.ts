/**
 * Azure OpenAI Realtime API Service
 * 
 * This service provides WebSocket-based realtime audio conversations using Azure OpenAI's GPT-4o Realtime API.
 * It handles bidirectional audio streaming for more responsive, natural conversations compared to the
 * traditional Speech SDK (STT → LLM → TTS) approach.
 * 
 * Key Features:
 * - WebSocket connection management with Azure OpenAI Realtime API
 * - PCM16 24kHz audio streaming (input and output)
 * - Function calling support for conversation evaluation
 * - Session configuration with system instructions
 * - Voice activity detection (VAD) and turn detection
 */

import { WebSocket } from 'ws';
import { config } from '../config/env';
import type { ScenarioParameters } from '../types/api';
import { TemplateManager } from '../prompts/templateManager';

/**
 * Maps Azure Neural voices to OpenAI Realtime API voices
 * Azure voices like 'AndrewNeural' are not supported by OpenAI Realtime API
 * This maps them to the closest equivalent OpenAI voice
 * 
 * Supported voices: alloy, ash, ballad, coral, echo, sage, shimmer, verse, marin, cedar
 */
function mapVoiceToRealtimeVoice(voice: string | undefined): string {
  if (!voice) return 'alloy';

  // Already an OpenAI voice (updated list as of Dec 2025)
  const openAIVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];
  if (openAIVoices.includes(voice.toLowerCase())) {
    return voice.toLowerCase();
  }

  // Map Azure Neural voices to OpenAI equivalents
  const voiceMap: Record<string, string> = {
    // Male voices
    'andrewneural': 'echo',
    'brianeural': 'alloy',
    'guyneural': 'echo',
    'davisneural': 'echo',
    
    // Female voices
    'jennyneural': 'shimmer',
    'arianeural': 'sage',
    'emmanejural': 'shimmer',
    'sarahneural': 'coral',
    'janeneural': 'ballad',
    'nancyneural': 'verse',
    
    // Generic mappings
    'male': 'echo',
    'female': 'shimmer'
  };

  const normalizedVoice = voice.toLowerCase().replace(/[_\s-]/g, '');
  return voiceMap[normalizedVoice] || 'alloy';
}

export interface RealtimeSessionConfig {
  /** System instructions for the conversation */
  systemInstructions?: string;
  /** Voice to use for responses (alloy, echo, fable, onyx, nova, shimmer) */
  voice?: string;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Scenario parameters for contextual prompts */
  parameters?: ScenarioParameters;
}

export interface RealtimeMessage {
  type: 'audio' | 'text' | 'function_call' | 'error' | 'session_update';
  data: any;
}

/**
 * Manages a single realtime conversation session with Azure OpenAI
 */
export class RealtimeConversationSession {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private sessionId: string;
  private config: RealtimeSessionConfig;
  
  constructor(sessionId: string, config: RealtimeSessionConfig = {}) {
    this.sessionId = sessionId;
    this.config = config;
  }

  /**
   * Establishes WebSocket connection to Azure OpenAI Realtime API
   */
  async connect(): Promise<WebSocket> {
    const endpoint = config.azureOpenAIRealtimeEndpoint || config.azureOpenAiEndpoint;
    const apiKey = config.azureOpenAIRealtimeKey || config.azureOpenAiKey;
    const deployment = config.azureOpenAIRealtimeDeployment || 'gpt-4o-realtime-preview';

    if (!endpoint || !apiKey) {
      throw new Error('Azure OpenAI Realtime API credentials not configured');
    }

    // Construct WebSocket URL for Azure OpenAI Realtime API
    // Format: wss://{endpoint}/openai/realtime?api-version=2024-10-01-preview&deployment={deployment}
    const wsUrl = endpoint
      .replace('https://', 'wss://')
      .replace('/openai', '') + 
      `/openai/realtime?api-version=2024-10-01-preview&deployment=${deployment}`;

    console.log(`[Realtime] Connecting to: ${wsUrl.replace(apiKey, '***')}`);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'api-key': apiKey,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      this.ws.on('open', async () => {
        console.log('[Realtime] WebSocket connected');
        this.isConnected = true;
        
        // Send session configuration
        await this.configureSession();
        
        if (this.ws) {
          resolve(this.ws);
        }
      });

      this.ws.on('error', (error) => {
        console.error('[Realtime] WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[Realtime] WebSocket closed');
        this.isConnected = false;
      });
    });
  }

  /**
   * Configures the session with system instructions and voice settings
   */
  private async configureSession(): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    // Get system instructions from template if parameters provided
    let systemInstructions = this.config.systemInstructions;
    if (!systemInstructions && this.config.parameters) {
      const { systemMessage } = await TemplateManager.getContextualPrompt([], this.config.parameters);
      systemInstructions = systemMessage;
    }

    // Map voice to OpenAI Realtime API compatible voice
    const realtimeVoice = mapVoiceToRealtimeVoice(this.config.voice);

    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: systemInstructions || 'You are a helpful AI assistant engaged in a voice conversation.',
        voice: realtimeVoice,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true
        },
        temperature: this.config.temperature ?? 0.8,
        max_response_output_tokens: 4096
      }
    };

    this.sendEvent(sessionUpdate);
    console.log('[Realtime] Session configured with voice:', realtimeVoice, '(mapped from:', this.config.voice || 'default', ')');
  }

  /**
   * Sends an event to the Realtime API
   */
  sendEvent(event: any): void {
    if (!this.ws || !this.isConnected) {
      console.warn('[Realtime] Cannot send event: WebSocket not connected');
      return;
    }
    this.ws.send(JSON.stringify(event));
  }

  /**
   * Sends audio data to the API (PCM16 24kHz base64 encoded)
   */
  sendAudio(audioBase64: string): void {
    this.sendEvent({
      type: 'input_audio_buffer.append',
      audio: audioBase64
    });
  }

  /**
   * Commits the audio buffer and triggers a response
   */
  commitAudio(): void {
    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
  }

  /**
   * Clears the input audio buffer
   */
  clearAudioBuffer(): void {
    this.sendEvent({
      type: 'input_audio_buffer.clear'
    });
  }

  /**
   * Sends a text message
   */
  sendText(text: string): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    });
    
    // Trigger response
    this.sendEvent({
      type: 'response.create'
    });
  }

  /**
   * Interrupts the current assistant response
   */
  interrupt(): void {
    this.sendEvent({
      type: 'response.cancel'
    });
  }

  /**
   * Updates session parameters and regenerates system prompt
   */
  async updateSessionParameters(parameters: ScenarioParameters): Promise<void> {
    if (!this.ws || !this.isConnected) {
      console.warn('[Realtime] Cannot update session: WebSocket not connected');
      return;
    }

    // Store parameters in config
    this.config.parameters = parameters;

    // Regenerate system instructions from template
    const { systemMessage } = await TemplateManager.getContextualPrompt([], parameters);
    
    console.log('[Realtime] Updating session with parameters:', {
      persona: parameters.persona,
      mood: parameters.mood,
      voice: parameters.voice,
      templateName: parameters.templateName,
      scenarioId: parameters.scenarioId
    });

    // Map voice to OpenAI Realtime API compatible voice
    const realtimeVoice = mapVoiceToRealtimeVoice(parameters.voice || this.config.voice);

    // Update session with new instructions
    const sessionUpdate = {
      type: 'session.update',
      session: {
        instructions: systemMessage,
        voice: realtimeVoice,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true
        }
      }
    };

    this.sendEvent(sessionUpdate);
    console.log('[Realtime] Session updated with new system prompt and voice:', realtimeVoice, '(mapped from:', parameters.voice || this.config.voice || 'default', ')');
  }

  /**
   * Closes the WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      console.log('[Realtime] Session closed:', this.sessionId);
    }
  }

  /**
   * Gets the underlying WebSocket for custom event handling
   */
  getWebSocket(): WebSocket | null {
    return this.ws;
  }

  /**
   * Checks if the session is currently connected
   */
  connected(): boolean {
    return this.isConnected;
  }
}

/**
 * Factory function to create a new realtime conversation session
 */
export function createRealtimeSession(
  sessionId: string,
  config: RealtimeSessionConfig = {}
): RealtimeConversationSession {
  return new RealtimeConversationSession(sessionId, config);
}
