import React, { createContext, useContext, useState } from 'react';
import type { VoiceContextType, VoiceOption } from './voice-types';

// Available voice options for Azure Speech Services
const VOICE_OPTIONS: VoiceOption[] = [
  { 
    name: 'Jenny', 
    value: 'JennyNeural', 
    gender: 'female',
    description: 'Clear, professional female voice'
  },
  { 
    name: 'Andrew', 
    value: 'AndrewNeural', 
    gender: 'male',
    description: 'Warm, friendly male voice'
  },
  { 
    name: 'Fable', 
    value: 'FableNeural', 
    gender: 'female',
    description: 'Expressive, storytelling female voice'
  },  { 
    name: 'Alloy HD', 
    value: 'en-US-Alloy:DragonHDLatestNeural', 
    gender: 'neutral',
    description: 'High-definition neural voice'
  },
];

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  const getVoiceByValue = (value: string): VoiceOption | undefined => {
    return VOICE_OPTIONS.find(voice => voice.value === value);
  };

  return (
    <VoiceContext.Provider 
      value={{ 
        voiceOptions: VOICE_OPTIONS,
        selectedVoice, 
        setSelectedVoice,
        getVoiceByValue
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used within a VoiceProvider');
  return context;
};
