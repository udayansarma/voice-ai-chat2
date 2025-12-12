/**
 * Custom hook for managing Azure OpenAI Realtime API conversations
 * 
 * This hook provides a WebSocket-based interface for realtime voice conversations
 * using Azure OpenAI's GPT-4o Realtime API. It handles:
 * - WebSocket connection to server proxy
 * - Audio capture and streaming (PCM16 24kHz)
 * - Audio playback from server
 * - Transcript handling
 * - Session management
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScenarioParameters } from '../context/scenario-parameters';

export interface RealtimeConfig {
  /** Server WebSocket endpoint (default: ws://localhost:5000/api/realtime/session) */
  endpoint?: string;
  /** Voice to use (alloy, echo, fable, onyx, nova, shimmer) */
  voice?: string;
  /** Temperature for response generation (0-1) */
  temperature?: number;
  /** Scenario parameters for contextual prompts */
  parameters?: ScenarioParameters;
}

export interface RealtimeMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioTranscript?: boolean;
}

export interface RealtimeState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  messages: RealtimeMessage[];
  error: string | null;
  connect: (config?: RealtimeConfig) => Promise<void>;
  disconnect: () => void;
  startListening: () => void;
  stopListening: () => void;
  sendText: (text: string) => void;
  interrupt: () => void;
  updateSession: (parameters: ScenarioParameters) => void;
}

/**
 * Hook for managing realtime conversation with Azure OpenAI
 */
export const useRealtimeConversation = (): RealtimeState => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<RealtimeMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isPlayingRef = useRef(false);
  const configRef = useRef<RealtimeConfig>({});
  const playbackScheduledTimeRef = useRef<number>(0);
  const audioBufferRef = useRef<Int16Array[]>([]);
  const bufferTimerRef = useRef<number | null>(null);
  const botStartedSpeakingAtRef = useRef<number>(0); // Track when bot started speaking
  const currentResponseItemIdRef = useRef<string | null>(null); // Track current assistant message item for truncation
  const audioPlaybackPositionRef = useRef<number>(0); // Track playback position in milliseconds
  const isResponseActiveRef = useRef<boolean>(false); // Track if response is currently active
  const hasInterruptedRef = useRef<boolean>(false); // Track if we've already interrupted this response
  const assistantTranscriptRef = useRef<string>(''); // Accumulate assistant transcript deltas

  /**
   * Flushes buffered audio chunks to server
   * NOTE: Server-side VAD handles all turn-taking and interruptions automatically
   */
  const flushAudioBuffer = useCallback(() => {
    if (audioBufferRef.current.length === 0 || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // Concatenate all buffered chunks
    const totalLength = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of audioBufferRef.current) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convert to base64
    const bytes = new Uint8Array(combined.buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    console.log('[Realtime] Flushing audio buffer:', audioBufferRef.current.length, 'chunks,', base64.length, 'chars');

    wsRef.current.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64
    }));

    // Clear buffer
    audioBufferRef.current = [];
  }, []);

  /**
   * Flushes buffered audio to server
   */
  const playAudio = useCallback((pcm16Data: string | ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }

    const audioContext = audioContextRef.current;
    
    // Convert to Uint8Array
    let bytes: Uint8Array;
    if (typeof pcm16Data === 'string') {
      // Decode base64 to PCM16
      const binaryString = atob(pcm16Data);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      // Direct ArrayBuffer
      bytes = new Uint8Array(pcm16Data);
    }
    
    // Ensure byte length is even for Int16Array
    if (bytes.length % 2 !== 0) {
      bytes = bytes.slice(0, bytes.length - 1);
    }
    
    // Convert PCM16 to Float32
    const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }

    // Create audio buffer
    const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    
    // Schedule playback
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    // Calculate when to start this chunk
    const currentTime = audioContext.currentTime;
    const scheduleTime = Math.max(currentTime, playbackScheduledTimeRef.current);
    
    console.log(`[Realtime] Scheduling audio: ${float32.length} samples (${(float32.length / 24000).toFixed(3)}s) at ${scheduleTime.toFixed(3)}`);
    
    source.onended = () => {
      // Check if this was the last chunk
      if (audioContext.currentTime >= playbackScheduledTimeRef.current) {
        console.log('[Realtime] Audio playback stream ended');
        setIsSpeaking(false);
        isPlayingRef.current = false;
        isResponseActiveRef.current = false;
        hasInterruptedRef.current = false;
        botStartedSpeakingAtRef.current = 0;
        currentResponseItemIdRef.current = null;
        audioPlaybackPositionRef.current = 0;
        playbackScheduledTimeRef.current = 0;
      }
    };
    
    setIsSpeaking(true);
    if (!isPlayingRef.current) {
      // First audio chunk - track when bot started speaking
      isPlayingRef.current = true;
      botStartedSpeakingAtRef.current = Date.now();
      audioPlaybackPositionRef.current = 0;
    }
    source.start(scheduleTime);
    
    // Update audio playback position in milliseconds for truncation
    const chunkDurationMs = (float32.length / 24000) * 1000;
    audioPlaybackPositionRef.current += chunkDurationMs;
    
    // Update scheduled time for next chunk
    playbackScheduledTimeRef.current = scheduleTime + (float32.length / 24000);
  }, []);

  /**
   * Starts capturing audio from microphone
   */
  const startAudioCapture = useCallback(async () => {
    try {
      // If bot is speaking, interrupt it when user starts speaking
      if (isPlayingRef.current) {
        console.log('[Realtime] User started speaking, interrupting bot response');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'response.cancel'
          }));
        }
        setIsSpeaking(false);
        isPlayingRef.current = false;
        playbackScheduledTimeRef.current = 0;
        
        // Stop any ongoing audio playback
        if (audioContextRef.current) {
          // Closing and reopening the audio context stops all playback
          const currentSampleRate = audioContextRef.current.sampleRate;
          audioContextRef.current.close();
          audioContextRef.current = new AudioContext({ sampleRate: currentSampleRate });
        }
      }
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode for audio processing (deprecated but widely supported)
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.warn('[Realtime] WebSocket not ready, skipping audio chunk');
          return;
        }
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        
        // Add to buffer
        audioBufferRef.current.push(pcm16);
        
        // Set timer to flush buffer after 100ms if not already set (reduced for more responsive turn-taking)
        if (bufferTimerRef.current === null) {
          bufferTimerRef.current = window.setTimeout(() => {
            flushAudioBuffer();
            bufferTimerRef.current = null;
          }, 100);
        }
      };

      source.connect(processor);
      
      // Create a dummy destination to activate the processor WITHOUT playing audio
      // This prevents feedback while still triggering onaudioprocess events
      const silentDestination = audioContextRef.current.createMediaStreamDestination();
      processor.connect(silentDestination);
      
      setIsListening(true);
      console.log('[Realtime] Audio capture started, processor connected to silent destination');
    } catch (err) {
      console.error('[Realtime] Failed to start audio capture:', err);
      setError('Failed to access microphone');
    }
  }, [flushAudioBuffer]);

  /**
   * Stops capturing audio
   */
  const stopAudioCapture = useCallback(() => {
    // Clear buffer timer and flush any remaining audio
    if (bufferTimerRef.current !== null) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    flushAudioBuffer();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // DON'T commit when using server_vad - Azure auto-detects speech end
    // Manual commit causes "buffer too small" errors when buffer is empty

    setIsListening(false);
    console.log('[Realtime] Audio capture stopped');
  }, [flushAudioBuffer]);

  /**
   * Connects to the realtime API WebSocket
   */
  const connect = useCallback(async (config: RealtimeConfig = {}) => {
    setError(null);
    configRef.current = config;

    // Use provided endpoint or construct from API URL
    let wsUrl: string;
    if (config.endpoint) {
      wsUrl = config.endpoint;
      // Add query parameters if not already present
      if (!wsUrl.includes('?')) {
        wsUrl += `?voice=${config.voice || 'alloy'}&temperature=${config.temperature || 0.8}`;
      }
    } else {
      const apiBaseUrl = (window as any).ENV?.VITE_API_URL || 'http://localhost:5000';
      const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss' : 'ws';
      const wsHost = apiBaseUrl.replace('https://', '').replace('http://', '');
      wsUrl = `${wsProtocol}://${wsHost}/api/realtime/session?voice=${config.voice || 'alloy'}&temperature=${config.temperature || 0.8}`;
    }

    console.log('[Realtime] Connecting to:', wsUrl);

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Realtime] WebSocket connected');
        setIsConnected(true);
        
        // Update session with parameters if provided
        if (config.parameters) {
          ws.send(JSON.stringify({
            type: 'session.update',
            parameters: config.parameters
          }));
        }
        
        resolve();
      };

      ws.onmessage = async (event) => {
        try {
          // Check if message is binary (Blob) or text (JSON)
          if (event.data instanceof Blob) {
            console.log('[Realtime] Received binary blob:', event.data.size, 'bytes');
            // Azure sometimes sends binary audio data directly
            const arrayBuffer = await event.data.arrayBuffer();
            playAudio(arrayBuffer);
            return;
          }

          // Parse JSON message from Azure
          const message = JSON.parse(event.data);
          
          // Handle different event types
          switch (message.type) {
            case 'connection.established':
              console.log('[Realtime] Session established:', message.session_id);
              break;

            case 'response.created':
              // Response started - mark as active and reset transcript accumulator
              isResponseActiveRef.current = true;
              hasInterruptedRef.current = false; // Reset for new response
              assistantTranscriptRef.current = ''; // Reset transcript accumulator
              console.log('[Realtime] Response started');
              break;

            case 'response.output_item.added':
              // Track the assistant message item ID for potential truncation
              if (message.item?.role === 'assistant') {
                currentResponseItemIdRef.current = message.item.id;
                console.log('[Realtime] Assistant response item created:', message.item.id);
              }
              break;

            case 'response.audio.delta':
              // Play audio chunk (base64-encoded PCM16)
              console.log('[Realtime] Received audio delta:', message.delta?.length || 0, 'chars');
              if (message.delta) {
                playAudio(message.delta);
              }
              break;

            case 'response.audio_transcript.delta':
              // Accumulate assistant transcript deltas
              if (message.delta) {
                assistantTranscriptRef.current += message.delta;
                console.log('[Realtime] Assistant transcript delta:', message.delta);
              }
              break;

            case 'conversation.item.input_audio_transcription.completed':
              // User's speech was transcribed
              console.log('[Realtime] User speech transcribed:', message.transcript);
              if (message.transcript) {
                setMessages(prev => [...prev, {
                  role: 'user',
                  content: message.transcript,
                  timestamp: new Date(),
                  audioTranscript: true
                }]);
              }
              break;

            case 'response.done':
              // Assistant finished speaking - add complete transcript to messages
              console.log('[Realtime] Response completed');
              isResponseActiveRef.current = false;
              
              // Add assistant's complete transcript to messages if we have any
              if (assistantTranscriptRef.current.trim()) {
                console.log('[Realtime] Adding assistant transcript:', assistantTranscriptRef.current);
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: assistantTranscriptRef.current,
                  timestamp: new Date(),
                  audioTranscript: true
                }]);
                assistantTranscriptRef.current = ''; // Reset for next response
              }
              break;

            case 'conversation.item.truncated':
              // Server confirmed truncation - transcript synchronized
              console.log('[Realtime] Conversation item truncated:', message.item_id);
              break;

            case 'error':
              const errorMsg = typeof message.error === 'string' 
                ? message.error 
                : message.error?.message || JSON.stringify(message.error);
              console.error('[Realtime] Server error:', message.error);
              setError(errorMsg);
              break;
          }
        } catch (err) {
          console.error('[Realtime] Failed to parse message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Realtime] WebSocket error:', err);
        setError('WebSocket connection error');
        setIsConnected(false);
        reject(err);
      };

      ws.onclose = () => {
        console.log('[Realtime] WebSocket closed');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        stopAudioCapture();
      };
    });
  }, [playAudio, stopAudioCapture]);

  /**
   * Disconnects from the realtime API
   */
  const disconnect = useCallback(() => {
    stopAudioCapture();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, [stopAudioCapture]);

  /**
   * Starts listening for voice input
   */
  const startListening = useCallback(() => {
    if (!isConnected) {
      setError('Not connected to realtime API');
      return;
    }
    startAudioCapture();
  }, [isConnected, startAudioCapture]);

  /**
   * Stops listening for voice input
   */
  const stopListening = useCallback(() => {
    stopAudioCapture();
  }, [stopAudioCapture]);

  /**
   * Sends a text message
   */
  const sendText = useCallback((text: string) => {
    if (!wsRef.current || !isConnected) {
      setError('Not connected');
      return;
    }

    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }));

    wsRef.current.send(JSON.stringify({
      type: 'response.create'
    }));

    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: new Date()
    }]);
  }, [isConnected]);

  /**
   * Interrupts the current assistant response
   */
  const interrupt = useCallback(() => {
    if (!wsRef.current || !isConnected) return;

    wsRef.current.send(JSON.stringify({
      type: 'response.cancel'
    }));

    setIsSpeaking(false);
  }, [isConnected]);

  /**
   * Updates the session with new parameters (server will generate system prompt)
   */
  const updateSession = useCallback((parameters: ScenarioParameters) => {
    if (!wsRef.current || !isConnected) {
      console.warn('[Realtime] Cannot update session: not connected');
      return;
    }

    console.log('[Realtime] Updating session with parameters:', parameters);

    // Send parameters to server which will regenerate the system prompt
    wsRef.current.send(JSON.stringify({
      type: 'session.update',
      parameters
    }));

    configRef.current.parameters = parameters;
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    messages,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText,
    interrupt,
    updateSession
  };
};
