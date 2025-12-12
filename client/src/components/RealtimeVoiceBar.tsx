import React, { useEffect } from 'react';
import { Box, IconButton, Typography, Chip } from '@mui/material';
import { 
  Mic as MicIcon, 
  MicOff as MicOffIcon,
  GraphicEq as GraphicEqIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon
} from '@mui/icons-material';
import { useRealtimeConversation } from '../hooks/useRealtimeConversation';
import type { ScenarioParameters } from '../context/scenario-parameters';

interface RealtimeVoiceBarProps {
  parameters?: ScenarioParameters;
  onMessageReceived?: (role: 'user' | 'assistant', content: string) => void;
}

const RealtimeVoiceBar: React.FC<RealtimeVoiceBarProps> = ({ 
  parameters,
  onMessageReceived 
}) => {
  const {
    isConnected,
    isListening,
    isSpeaking,
    messages,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    updateSession
  } = useRealtimeConversation();

  // Handle new messages from the realtime API
  useEffect(() => {
    if (messages.length > 0 && onMessageReceived) {
      const lastMessage = messages[messages.length - 1];
      // Only forward actual transcript messages, not status updates
      if (lastMessage.audioTranscript) {
        onMessageReceived(lastMessage.role, lastMessage.content);
      }
    }
  }, [messages, onMessageReceived]);

  // Update session when parameters change
  useEffect(() => {
    if (isConnected && parameters) {
      updateSession(parameters);
    }
  }, [isConnected, parameters, updateSession]);

  const handleConnect = async () => {
    try {
      // Get the base API URL from runtime config
      const apiBaseUrl = (window as any).ENV?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Convert HTTP/HTTPS to WS/WSS for WebSocket connection
      const wsUrl = apiBaseUrl.replace(/^http/, 'ws');
      const endpoint = import.meta.env.VITE_REALTIME_WS_URL || `${wsUrl}/api/realtime/session`;
      
      console.log('[RealtimeVoiceBar] Connecting to WebSocket:', endpoint);
      
      await connect({
        endpoint,
        voice: parameters?.voice || 'alloy',
        temperature: 0.8,
        parameters
      });
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = () => {
    if (isListening) {
      stopListening();
    }
    disconnect();
  };

  const handleToggleListening = () => {
    if (!isConnected) {
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      pt: 1.5,
      pb: 0.5,
      borderTop: '1px solid',
      borderColor: 'grey.200',
      minHeight: 0,
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 249, 250, 0.8) 100%)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Status chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Chip 
          label={isConnected ? "Connected" : "Disconnected"}
          size="small"
          color={isConnected ? "success" : "default"}
          icon={isConnected ? <LinkIcon /> : <LinkOffIcon />}
          sx={{ fontSize: '0.75rem', fontWeight: 600 }}
        />
        {isSpeaking && (
          <Chip 
            label="AI Speaking"
            size="small"
            color="secondary"
            icon={<GraphicEqIcon />}
            sx={{ fontSize: '0.75rem', fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Main control buttons */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {/* Connect/Disconnect button */}
        <IconButton
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isListening || isSpeaking}
          sx={{ 
            width: 48,
            height: 48,
            background: isConnected 
              ? 'linear-gradient(135deg, #28a745 0%, #218838 100%)'
              : 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)',
            color: 'white',
            transition: 'all 0.3s ease',
            boxShadow: isConnected 
              ? '0 4px 16px rgba(40, 167, 69, 0.3)'
              : '0 4px 16px rgba(108, 117, 125, 0.3)',
            '&:hover': {
              background: isConnected 
                ? 'linear-gradient(135deg, #218838 0%, #1e7e34 100%)'
                : 'linear-gradient(135deg, #545b62 0%, #3d4349 100%)',
              transform: 'scale(1.08) translateY(-2px)',
              boxShadow: isConnected 
                ? '0 6px 24px rgba(40, 167, 69, 0.4)'
                : '0 6px 24px rgba(108, 117, 125, 0.4)',
            },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          }}
        >
          {isConnected ? <LinkIcon sx={{ fontSize: 24 }} /> : <LinkOffIcon sx={{ fontSize: 24 }} />}
        </IconButton>

        {/* Microphone button */}
        <IconButton
          onClick={handleToggleListening}
          disabled={!isConnected || isSpeaking}
          sx={{ 
            width: 58,
            height: 58,
            background: isListening 
              ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'
              : 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
            color: 'white',
            transition: 'all 0.3s ease',
            boxShadow: isListening 
              ? '0 4px 16px rgba(220, 53, 69, 0.3)'
              : '0 4px 16px rgba(0, 102, 204, 0.3)',
            '&:hover': {
              background: isListening 
                ? 'linear-gradient(135deg, #c82333 0%, #a71e2a 100%)'
                : 'linear-gradient(135deg, #004499 0%, #002266 100%)',
              transform: 'scale(1.08) translateY(-2px)',
              boxShadow: isListening 
                ? '0 6px 24px rgba(220, 53, 69, 0.4)'
                : '0 6px 24px rgba(0, 102, 204, 0.4)',
            },
            '&:active': {
              transform: 'scale(1.02) translateY(0px)',
            },
            '&:disabled': {
              opacity: 0.5,
              cursor: 'not-allowed',
            },
          }}
        >
          {isListening ? (
            <MicOffIcon sx={{ fontSize: 32 }} />
          ) : (
            <MicIcon sx={{ fontSize: 32 }} />
          )}
        </IconButton>
      </Box>

      {/* Status text */}
      {error && (
        <Typography
          variant="body2"
          sx={{ 
            mt: 0.75, 
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'error.main',
            textAlign: 'center',
          }}
        >
          ⚠️ {error}
        </Typography>
      )}

      {isListening && (
        <Typography
          variant="body2"
          sx={{ 
            mt: 0.75, 
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'error.main',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #dc3545, #c82333)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🎤 Listening... Speak now
        </Typography>
      )}

      {isSpeaking && (
        <Typography
          variant="body2"
          sx={{ 
            mt: 0.75, 
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'secondary.main',
            textAlign: 'center',
          }}
        >
          🔊 AI is speaking...
        </Typography>
      )}

      <Typography 
        variant="caption" 
        sx={{ 
          mt: 0.5,
          textAlign: 'center', 
          maxWidth: '80%', 
          fontSize: '0.875rem',
          color: 'grey.600',
          fontWeight: 500,
        }}
      >
        {!isConnected 
          ? 'Click link icon to connect to Realtime API'
          : isListening 
            ? 'Click to stop recording' 
            : isSpeaking
              ? 'AI is responding...'
              : 'Click microphone to start speaking'}
      </Typography>
    </Box>
  );
};

export default RealtimeVoiceBar;
