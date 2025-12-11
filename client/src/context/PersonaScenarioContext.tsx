import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import type { Persona, Scenario } from './persona-scenario-types';
import { generateRandomName, inferGenderFromPersona, type GeneratedName } from '../utils/nameGenerator';
import { useAuth } from './AuthContext';



interface PersonaScenarioContextData {
  personas: Persona[];
  scenarios: Scenario[];
  selectedPersona: Persona | null;
  setSelectedPersona: (persona: Persona | null) => void;
  selectedScenario: Scenario | null;
  setSelectedScenario: (scenario: Scenario | null) => void;
  generatedName: GeneratedName | null;
  loading: boolean;
  error: string | null;
  // CRUD operations for personas
  createPersona: (persona: Omit<Persona, 'id'>) => Promise<void>;
  updatePersona: (id: string, persona: Partial<Persona>) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  // CRUD operations for scenarios
  createScenario: (scenario: Omit<Scenario, 'id'>) => Promise<void>;
  updateScenario: (id: string, scenario: Partial<Scenario>) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
}

const PersonaScenarioContext = createContext<PersonaScenarioContextData>({
  personas: [],
  scenarios: [],
  selectedPersona: null,
  setSelectedPersona: () => {},
  selectedScenario: null,
  setSelectedScenario: () => {},
  generatedName: null,
  loading: false,
  error: null,
  createPersona: async () => {},
  updatePersona: async () => {},
  deletePersona: async () => {},
  createScenario: async () => {},
  updateScenario: async () => {},
  deleteScenario: async () => {},
});

export const PersonaScenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [generatedName, setGeneratedName] = useState<GeneratedName | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Only fetch data when authenticated and not loading
    if (isAuthenticated && !authLoading) {
      setLoading(true);
      Promise.all([
        apiClient.get<{ personas: Persona[] }>('/api/personas'),
        apiClient.get<{ scenarios: Scenario[] }>('/api/scenarios'),
      ])
        .then(([personaRes, scenarioRes]) => {
          setPersonas(personaRes.data.personas || []);
          setScenarios(scenarioRes.data.scenarios || []);
          setError(null);
        })
        .catch(() => {
          setError('Failed to load personas or scenarios');
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading]);
  // Generate a new name when persona changes
  useEffect(() => {
    if (selectedPersona) {
      // Try to infer gender from persona, or generate random
      const inferredGender = inferGenderFromPersona(selectedPersona);
      console.log('PersonaScenarioProvider: Generating name for persona:', selectedPersona.name, 'inferred gender:', inferredGender);
      const name = generateRandomName(inferredGender);
      console.log('PersonaScenarioProvider: Generated name:', name);
      setGeneratedName(name);
    } else {
      setGeneratedName(null);
    }
  }, [selectedPersona]);

  // CRUD operations for personas
  const createPersona = async (personaData: Omit<Persona, 'id'>): Promise<void> => {
    try {
      const response = await apiClient.post<{ persona: Persona }>('/api/personas', personaData);
      setPersonas(prev => [...prev, response.data.persona]);
      setError(null);
    } catch (error) {
      setError('Failed to create persona');
      throw error;
    }
  };

  const updatePersona = async (id: string, personaData: Partial<Persona>): Promise<void> => {
    try {
      const response = await apiClient.put<{ persona: Persona }>(`/api/personas/${id}`, personaData);
      setPersonas(prev => prev.map(p => p.id === id ? response.data.persona : p));
      // Update selected persona if it's the one being updated
      if (selectedPersona?.id === id) {
        setSelectedPersona(response.data.persona);
      }
      setError(null);
    } catch (error) {
      setError('Failed to update persona');
      throw error;
    }
  };

  const deletePersona = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/personas/${id}`);
      setPersonas(prev => prev.filter(p => p.id !== id));
      // Clear selection if deleted persona was selected
      if (selectedPersona?.id === id) {
        setSelectedPersona(null);
      }
      setError(null);
    } catch (error) {
      setError('Failed to delete persona');
      throw error;
    }
  };

  // CRUD operations for scenarios
  const createScenario = async (scenarioData: Omit<Scenario, 'id'>): Promise<void> => {
    try {
      const response = await apiClient.post<{ scenario: Scenario }>('/api/scenarios', scenarioData);
      setScenarios(prev => [...prev, response.data.scenario]);
      setError(null);
    } catch (error) {
      setError('Failed to create scenario');
      throw error;
    }
  };

  const updateScenario = async (id: string, scenarioData: Partial<Scenario>): Promise<void> => {
    try {
      const response = await apiClient.put<{ scenario: Scenario }>(`/api/scenarios/${id}`, scenarioData);
      setScenarios(prev => prev.map(s => s.id === id ? response.data.scenario : s));
      // Update selected scenario if it's the one being updated
      if (selectedScenario?.id === id) {
        setSelectedScenario(response.data.scenario);
      }
      setError(null);
    } catch (error) {
      setError('Failed to update scenario');
      throw error;
    }
  };

  const deleteScenario = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/scenarios/${id}`);
      setScenarios(prev => prev.filter(s => s.id !== id));
      // Clear selection if deleted scenario was selected
      if (selectedScenario?.id === id) {
        setSelectedScenario(null);
      }
      setError(null);
    } catch (error) {
      setError('Failed to delete scenario');
      throw error;
    }
  };
  return (
    <PersonaScenarioContext.Provider value={{ 
      personas, 
      scenarios, 
      selectedPersona, 
      setSelectedPersona, 
      selectedScenario, 
      setSelectedScenario, 
      generatedName, 
      loading, 
      error,
      createPersona,
      updatePersona,
      deletePersona,
      createScenario,
      updateScenario,
      deleteScenario
    }}>
      {children}
    </PersonaScenarioContext.Provider>
  );
};

export const usePersonaScenario = (): PersonaScenarioContextData => {
  const context = useContext(PersonaScenarioContext);
  if (!context) {
    throw new Error('usePersonaScenario must be used within a PersonaScenarioProvider');
  }
  return context;
};
