// Voice-related types for VoiceContext
export interface VoiceOption {
  name: string;
  value: string;
  gender: 'male' | 'female' | 'neutral';
  description?: string;
}

export interface VoiceContextType {
  voiceOptions: VoiceOption[];
  selectedVoice: string | null;
  setSelectedVoice: (voice: string | null) => void;
  getVoiceByValue: (value: string) => VoiceOption | undefined;
}
