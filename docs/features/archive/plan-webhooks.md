# Plan: Implementing WebSockets for Conversational Azure Speech in Voice AI Chat

## Overview
To make the Voice AI Chat app more conversational and responsive, we will implement WebSocket-based communication for both speech-to-text (STT) and text-to-speech (TTS) using Azure Speech Services. This will enable continuous speech recognition and real-time streaming of synthesized speech, reducing latency and improving the user experience.

## Goals
- Enable continuous speech recognition (STT) via WebSockets, so users do not need to repeatedly press a button.
- Enable real-time streaming of TTS responses, allowing the assistant to "speak" as text is generated.
- Maintain compatibility with Azure Speech SDK and best practices for connection management.

## Implementation Steps

### 1. Research & SDK Selection
- Review Azure Speech SDK documentation for WebSocket support in both STT and TTS.
- Ensure the SDK (likely `microsoft-cognitiveservices-speech-sdk`) is up-to-date and supports required features in the frontend (React/TypeScript) and backend (Node.js/TypeScript).

### 2. Speech-to-Text (STT) via WebSocket
- Refactor `useAzureSpeechRecognition` hook to use continuous recognition mode.
- Establish a persistent WebSocket connection to Azure Speech Service for live transcription.
- Update UI to reflect live/continuous listening state.
- Handle connection lifecycle: reconnect on error, close on user stop.

### 3. Text-to-Speech (TTS) via WebSocket
- Refactor `useAudioPlayer` and backend TTS logic to support streaming audio from Azure as it is synthesized.
- Use the WebSocket v2 endpoint for TTS streaming.
- Play audio chunks as they arrive for real-time feedback.
- Optionally, update UI to show speaking/progress state.

### 4. Backend Changes (if needed)
- If TTS is handled server-side, update `server/src/speechService.ts` to support streaming TTS responses to the client.
- Consider using server-sent events (SSE) or WebSockets to forward audio streams to the frontend.

### 5. Frontend Integration
- Update `ChatInterface.tsx` and related components to support conversational flow:
  - Start/stop listening without button presses.
  - Play TTS responses as they stream in.
- Ensure error handling and user feedback for connection issues.

### 6. Testing & Validation
- Test on various browsers and devices for compatibility.
- Validate latency improvements and conversational experience.
- Ensure fallback to current behavior if WebSocket connection fails.

## References
- [Azure Speech SDK WebSocket Support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-lower-speech-synthesis-latency)
- [Azure Speech SDK for JavaScript](https://github.com/Azure-Samples/cognitive-services-speech-sdk-js)

## Future Enhancements
- Support for interruption (barge-in) during TTS playback.
- Dynamic voice selection and language switching.
- Advanced error recovery and reconnection strategies.

---
*This plan outlines the steps to make the Voice AI Chat app more conversational using Azure Speech WebSockets. No code changes are included in this document.*
