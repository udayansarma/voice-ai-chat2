import { useState, useCallback, useRef } from 'react';
import apiClient from '../utils/apiClient';

interface AudioPlayerState {
  isPlaying: boolean;
  currentPlayingId: string | null;
  playAudio: (text: string, id: string, voiceGender?: string) => Promise<void>;
  stopAudio: () => void;
}

export const useAudioPlayer = (): AudioPlayerState => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = useCallback(async (text: string, id: string, voice?: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setIsPlaying(true);
      setCurrentPlayingId(id);      // Determine if voice is a known name or gender
      let voiceGender: string | undefined;
      let voiceName: string | undefined;
      if (voice === 'JennyNeural' || voice === 'AndrewNeural' || voice === 'FableNeural' || voice === 'en-US-Alloy:DragonHDLatestNeural') {
        voiceName = voice;
      } else if (voice === 'male' || voice === 'female') {
        voiceGender = voice;
      }      // Fetch the full MP3 audio as a blob
      const response = await apiClient.post('/api/speech/synthesize', 
        { text, voiceGender, voiceName },
        { responseType: 'blob' }
      );
      const audioBlob = response.data;
      console.debug('Fetched audio blob:', audioBlob, 'size:', audioBlob.size, 'type:', audioBlob.type);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentPlayingId(null);
      };
      audio.onerror = (e) => {
        // Only log error if audio is actually playing
        if (!audio.paused) {
          setIsPlaying(false);
          setCurrentPlayingId(null);
          console.error('Audio element error', e);
        }
      };
      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      setCurrentPlayingId(null);
      console.error('playAudio error', error);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
  }, []);

  return {
    isPlaying,
    currentPlayingId,
    playAudio,
    stopAudio,
  };
};
