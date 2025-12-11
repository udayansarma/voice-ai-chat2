import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { fetchSpeechToken } from '../utils/speechApi';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import apiClient from '../utils/apiClient';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

const SpeechDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (testName: string, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(r => 
      r.test === testName ? { ...r, ...updates } : r
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Check if server is reachable
    addResult({ test: 'Server Health Check', status: 'pending', message: 'Checking server connection...' });
    try {
      const response = await apiClient.get('/api/health');
      const data = response.data;
      updateResult('Server Health Check', {
        status: 'success',
        message: `Server is running: ${data.message}`,
        details: data
      });
    } catch (error) {
      updateResult('Server Health Check', {
        status: 'error',
        message: `Server unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // Test 2: Check speech token endpoint
    addResult({ test: 'Speech Token Fetch', status: 'pending', message: 'Fetching speech token...' });
    try {
      const tokenData = await fetchSpeechToken();
      updateResult('Speech Token Fetch', {
        status: 'success',
        message: `Token obtained for region: ${tokenData.region}`,
        details: {
          region: tokenData.region,
          tokenLength: tokenData.token.length,
          tokenPreview: tokenData.token.substring(0, 50) + '...'
        }
      });

      // Test 3: Test Azure Speech SDK configuration with the fetched token
      addResult({ test: 'Azure Speech SDK Config', status: 'pending', message: 'Testing Speech SDK configuration...' });
      try {
        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
          tokenData.token,
          tokenData.region
        );
        speechConfig.speechRecognitionLanguage = 'en-US';
        
        updateResult('Azure Speech SDK Config', {
          status: 'success',
          message: 'Speech SDK configured successfully',
          details: {
            language: speechConfig.speechRecognitionLanguage,
            region: tokenData.region
          }
        });

        // Test 3.5: Test actual speech recognition initialization
        addResult({ test: 'Speech Recognition Initialization', status: 'pending', message: 'Testing speech recognition initialization...' });
        try {
          const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
          const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
          
          // Test that we can set up event handlers
          recognizer.recognized = (_s, e) => {
            console.log('Test recognition result:', e.result);
          };
          
          recognizer.canceled = (_s, e) => {
            console.log('Test recognition canceled:', e.reason, e.errorDetails);
          };
          
          updateResult('Speech Recognition Initialization', {
            status: 'success',
            message: 'Speech recognizer initialized successfully',
            details: {
              recognizerState: 'Ready',
              audioSource: 'Default microphone'
            }
          });
          
          // Clean up the test recognizer
          recognizer.close();
          
        } catch (error) {
          updateResult('Speech Recognition Initialization', {
            status: 'error',
            message: `Speech recognition initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: error
          });
        }
        
      } catch (error) {
        updateResult('Azure Speech SDK Config', {
          status: 'error',
          message: `Speech SDK configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }
    } catch (error) {
      updateResult('Speech Token Fetch', {
        status: 'error',
        message: `Token fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    // Test 4: Check microphone permissions and test audio input
    addResult({ test: 'Microphone Permissions', status: 'pending', message: 'Checking microphone access...' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Test actual audio input
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Test for audio levels for 2 seconds
      let audioDetected = false;
      const testDuration = 2000;
      const startTime = Date.now();
      
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        if (average > 10) { // Threshold for detecting audio
          audioDetected = true;
        }
        
        if (Date.now() - startTime < testDuration) {
          requestAnimationFrame(checkAudio);
        } else {
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          updateResult('Microphone Permissions', {
            status: 'success',
            message: audioDetected 
              ? 'Microphone access granted and audio input detected' 
              : 'Microphone access granted but no audio detected (try speaking during diagnostics)',
            details: { 
              granted: true,
              audioDetected,
              averageLevel: dataArray.reduce((a, b) => a + b) / bufferLength
            }
          });
        }
      };
      
      checkAudio();
      
    } catch (error) {
      updateResult('Microphone Permissions', {
        status: 'error',
        message: `Microphone access denied: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }    // Test 5: Test speech recognition endpoint directly
    addResult({ test: 'Speech Recognition Endpoint', status: 'pending', message: 'Testing speech recognition endpoint...' });
    try {
      // Send empty audio data to test the endpoint structure (should fail gracefully)
      const response = await apiClient.post('/api/speech/recognize', { audioData: '' });
      
      // If we get here without error, the endpoint is working
      updateResult('Speech Recognition Endpoint', {
        status: 'success',
        message: 'Speech recognition endpoint is reachable and processing requests',
        details: response.data
      });
    } catch (error: any) {
      // For the speech recognition endpoint, we actually expect it to fail with empty audio
      // A 400 or 500 error with a meaningful message indicates the endpoint is working correctly
      if (error.response && error.response.status >= 400 && error.response.data?.error) {
        updateResult('Speech Recognition Endpoint', {
          status: 'success',
          message: 'Speech recognition endpoint is working (expected error for empty audio)',
          details: {
            status: error.response.status,
            expectedBehavior: 'Endpoint correctly rejects empty audio data',
            errorDetails: error.response.data
          }
        });
      } else {
        updateResult('Speech Recognition Endpoint', {
          status: 'error',
          message: `Speech recognition endpoint failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        });
      }
    }

    // Test 6: Check browser console for any JavaScript errors
    addResult({ test: 'Console Errors', status: 'pending', message: 'Checking for console errors...' });
    
    // We can't directly access console errors, but we can check if the speech recognition hook can be initialized
    try {
      // This is a simplified test - in a real scenario you'd need to check for specific errors
      const testErrors = (window as any).__speechErrors || [];
      if (testErrors.length > 0) {
        updateResult('Console Errors', {
          status: 'error',
          message: `Found ${testErrors.length} speech-related errors`,
          details: testErrors
        });
      } else {
        updateResult('Console Errors', {
          status: 'success',
          message: 'No speech-related console errors detected',
          details: { errors: [] }
        });
      }
    } catch (error) {
      updateResult('Console Errors', {
        status: 'error',
        message: `Error checking console: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      });
    }

    setIsRunning(false);
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '?';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Speech Recognition Diagnostics
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        This tool will help diagnose issues with Speech-to-Text functionality after changing Azure instances.
      </Typography>

      <Button 
        variant="contained" 
        onClick={runDiagnostics} 
        disabled={isRunning}
        sx={{ mb: 3 }}
      >
        {isRunning ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
        {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </Button>

      {results.map((result, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 8 }}>{getStatusIcon(result.status)}</span>
                {result.test}
              </Typography>
              <Chip 
                label={result.status.toUpperCase()} 
                color={getStatusColor(result.status)} 
                size="small" 
              />
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {result.message}
            </Typography>
            {result.details && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">View Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <pre style={{ 
                    backgroundColor: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.8rem'
                  }}>
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </AccordionDetails>
              </Accordion>
            )}
          </CardContent>
        </Card>
      ))}

      {results.length > 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Common Issues & Solutions:</strong>
            <br />• If Speech Token Fetch fails: Check server environment variables (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION)
            <br />• If Microphone Permissions fail: Allow microphone access in browser settings
            <br />• If Azure Speech SDK Config fails: Verify the Azure Speech Service instance is active and the region is correct
            <br />• If Speech Recognition Endpoint fails: Check server logs for detailed error messages
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default SpeechDiagnostics;
