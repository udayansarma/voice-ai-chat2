import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import type { Mood } from './mood-types';
import { useAuth } from './AuthContext';



interface MoodContextData {
  moods: Mood[];
  selectedMood: Mood | null;
  setSelectedMood: (mood: Mood | null) => void;
  loading: boolean;
  error: string | null;
  // CRUD operations for moods
  createMood: (mood: Omit<Mood, 'id'>) => Promise<void>;
  updateMood: (id: string, mood: Partial<Mood>) => Promise<void>;
  deleteMood: (id: string) => Promise<void>;
}

const MoodContext = createContext<MoodContextData>({
  moods: [],
  selectedMood: null,
  setSelectedMood: () => {},
  loading: false,
  error: null,
  createMood: async () => {},
  updateMood: async () => {},
  deleteMood: async () => {},
});

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [moods, setMoods] = useState<Mood[]>([]);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  useEffect(() => {
    // Only fetch moods when authenticated and not loading
    if (isAuthenticated && !authLoading) {
      setLoading(true);
      apiClient.get<{ moods: Mood[] }>('/api/moods')
        .then(res => {
          setMoods(res.data.moods || []);
          setError(null);
        })
        .catch(() => setError('Failed to load moods'))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading]);

  // CRUD operations for moods
  const createMood = async (moodData: Omit<Mood, 'id'>): Promise<void> => {
    try {
      const response = await apiClient.post<{ mood: Mood }>('/api/moods', moodData);
      setMoods(prev => [...prev, response.data.mood]);
      setError(null);
    } catch (error) {
      setError('Failed to create mood');
      throw error;
    }
  };

  const updateMood = async (id: string, moodData: Partial<Mood>): Promise<void> => {
    try {
      const response = await apiClient.put<{ mood: Mood }>(`/api/moods/${id}`, moodData);
      setMoods(prev => prev.map(m => m.id === id ? response.data.mood : m));
      // Update selected mood if it's the one being updated
      if (selectedMood?.id === id) {
        setSelectedMood(response.data.mood);
      }
      setError(null);
    } catch (error) {
      setError('Failed to update mood');
      throw error;
    }
  };

  const deleteMood = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/moods/${id}`);
      setMoods(prev => prev.filter(m => m.id !== id));
      // Clear selection if deleted mood was selected
      if (selectedMood?.id === id) {
        setSelectedMood(null);
      }
      setError(null);
    } catch (error) {
      setError('Failed to delete mood');
      throw error;
    }
  };
  return (
    <MoodContext.Provider value={{ 
      moods, 
      selectedMood, 
      setSelectedMood, 
      loading, 
      error,
      createMood,
      updateMood,
      deleteMood
    }}>
      {children}
    </MoodContext.Provider>  );
};

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
};
