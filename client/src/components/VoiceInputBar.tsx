import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Mic as MicIcon, MicOff as MicOffIcon } from '@mui/icons-material';

interface VoiceInputBarProps {
  isListening: boolean;
  toggleListening: () => void;
}

const VoiceInputBar: React.FC<VoiceInputBarProps> = ({ isListening, toggleListening }) => {
  return (    <Box sx={{ 
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
    }}>      <IconButton
        onClick={toggleListening} 
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
          mb: 0.75,
        }}
      >
        {isListening ? (
          <MicOffIcon sx={{ fontSize: 32 }} />
        ) : (
          <MicIcon sx={{ fontSize: 32 }} />
        )}
      </IconButton>      {isListening && (
        <Typography
          variant="body2"
          sx={{ 
            mb: 0.375, 
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
      <Typography 
        variant="caption" 
        sx={{ 
          textAlign: 'center', 
          maxWidth: '80%', 
          fontSize: '0.875rem',
          color: 'grey.600',
          fontWeight: 500,
        }}
      >
        {isListening ? 'Click to stop recording' : 'Click the microphone to start voice chat'}
      </Typography>
    </Box>
  );
};

export default VoiceInputBar;
