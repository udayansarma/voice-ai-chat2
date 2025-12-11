import { useState, useCallback, useEffect, useRef } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { fetchSpeechToken } from '../utils/speechApi';
import apiClient from '../utils/apiClient';

interface SpeechRecognitionState {
  isListening: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
}

export const useAzureSpeechRecognition = (onTranscript: (text: string) => void): SpeechRecognitionState => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechToken, setSpeechToken] = useState<string | null>(null);
  const [speechRegion, setSpeechRegion] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);  const stopTimeoutRef = useRef<number | null>(null);
  // Track actual speech duration (not session duration)
  const speechStartTime = useRef<number | null>(null);
  const totalSpeechDuration = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (recognizerRef.current) {
      recognizerRef.current.close();
      recognizerRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Fetch token on mount
  useEffect(() => {
    let isMounted = true;
    fetchSpeechToken()
      .then(({ token, region }) => {
        if (isMounted) {
          setSpeechToken(token);
          setSpeechRegion(region);
        }
      })
      .catch((err) => {
        setError('Failed to fetch speech token: ' + (err instanceof Error ? err.message : String(err)));
      });
    return () => { isMounted = false; };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    cleanup();
    try {
      if (!speechToken || !speechRegion) {
        setError('Speech token or region is missing.');
        return;
      }
      
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
        speechToken,
        speechRegion
      );
      speechConfig.speechRecognitionLanguage = 'en-US';        // Optimized audio configuration for natural speech with good responsiveness
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, "5000");
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, "600");
      speechConfig.setProperty(SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, "600");
      
      // Enable detailed logging and profanity filtering
      speechConfig.enableDictation();
      speechConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceResponse_RequestDetailedResultTrueFalse, "true");
      
      // Use the default microphone
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;
        setIsListening(true);
      // Reset speech duration tracking for this session
      totalSpeechDuration.current = 0;
      speechStartTime.current = null;

      recognizer.recognizing = () => {
        // Partial results (optional: can be used for live UI feedback)
      };
      recognizer.recognized = (_s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
          onTranscript(e.result.text);
        }
      };
      recognizer.sessionStarted = () => {
        // Session started
      };      recognizer.sessionStopped = () => {
        setIsListening(false);
        // Send total accumulated speech duration for this session
        if (totalSpeechDuration.current > 0) {
          apiClient.post('/api/stats/speech-duration', { seconds: totalSpeechDuration.current / 1000 })
            .catch(() => {/* ignore errors for now */});
        }
        cleanup();
      };      recognizer.speechStartDetected = () => {
        // Record when actual speech starts
        speechStartTime.current = Date.now();
      };
      recognizer.speechEndDetected = () => {
        // Calculate and accumulate actual speech duration
        if (speechStartTime.current) {
          const speechDuration = Date.now() - speechStartTime.current;
          totalSpeechDuration.current += speechDuration;
          speechStartTime.current = null;
        }
      };
      recognizer.canceled = (_s, e) => {
        setError(`Recognition canceled: ${e.errorDetails || e.reason}`);
        cleanup();
      };
      
      recognizer.startContinuousRecognitionAsync();
      
      // Timeout removed: recognition will continue until user stops it
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recognition');
      cleanup();
    }
  }, [cleanup, onTranscript, speechRegion, speechToken]);

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync(() => {
        cleanup();
      }, (err) => {
        setError(typeof err === 'string' ? err : 'Failed to stop recognition');
        cleanup();
      });
    } else {
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { isListening, error, startListening, stopListening };
};
