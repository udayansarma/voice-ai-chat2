// Web Speech API types are not always available in TypeScript's DOM lib, so we use 'any' for compatibility.
// This avoids conflicts and allows the hook to work in all browsers supporting the API.

import { useRef, useState, useCallback } from 'react';
import apiClient from '../utils/apiClient';

export interface UseAudioRecorderResult {
  startRecording: () => void;
  stopRecording: () => void;
  transcript: string;
  speechDuration: number; // milliseconds
  isRecording: boolean;
}

// Minimal SpeechRecognition types for cross-browser compatibility
interface SpeechRecognitionEventResult {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly 0: SpeechRecognitionEventResult;
  readonly isFinal: boolean;
  readonly length: number;
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResult[];
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

/**
 * Custom hook for audio recording and speech duration estimation using Web Speech API.
 * Estimates speech duration as the time between first and last recognition result.
 */
export const useAudioRecorder = (): UseAudioRecorderResult => {
  const [transcript, setTranscript] = useState('');
  const [speechDuration, setSpeechDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // Use ISpeechRecognition for browser compatibility
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const firstResultTime = useRef<number | null>(null);
  const lastResultTime = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    const SpeechRecognitionImpl = (window as unknown as { SpeechRecognition?: new () => ISpeechRecognition; webkitSpeechRecognition?: new () => ISpeechRecognition; }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => ISpeechRecognition; webkitSpeechRecognition?: new () => ISpeechRecognition; }).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      // Web Speech API not supported
      return;
    }
    const recognition: ISpeechRecognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (event.results.length > 0) {
        const now = Date.now();
        if (firstResultTime.current === null) {
          firstResultTime.current = now;
          // console.log('First speech result at', now);
        }
        lastResultTime.current = now;
        // console.log('Speech result at', now);
        setTranscript(event.results[event.results.length - 1][0].transcript);
      }
    };    recognition.onend = () => {
      setIsRecording(false);
      // console.log('Recognition ended. First:', firstResultTime.current, 'Last:', lastResultTime.current);
      if (firstResultTime.current && lastResultTime.current) {
        const durationMs = lastResultTime.current - firstResultTime.current;
        setSpeechDuration(durationMs);
        // console.log('Calculated durationMs:', durationMs);
        if (durationMs > 0) {
          apiClient.post('/api/stats/speech-duration', { seconds: durationMs / 1000 })
            .then(() => {/* posted speech duration */})
            .catch(() => {/* ignore errors for now */});
        } else {
          // console.log('Duration is zero, not posting');
        }
      }
      firstResultTime.current = null;
      lastResultTime.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return {
    startRecording,
    stopRecording,
    transcript,
    speechDuration,
    isRecording,
  };
};
