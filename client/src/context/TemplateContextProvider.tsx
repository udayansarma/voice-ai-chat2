import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import type { Template } from './template-types';
import { TemplateContext } from './template-context';
import { useAuth } from './AuthContext';

interface TemplateProviderProps {
  children: React.ReactNode;
}

const TemplateProvider: React.FC<TemplateProviderProps> = ({ children }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const { isAuthenticated, isLoading } = useAuth();

  const fetchTemplates = useCallback(async () => {
    if (!isAuthenticated || isLoading) return;
    
    try {
      const res = await apiClient.get<{ success: boolean; templates: Template[]; count: number }>('/api/templates');
      setTemplates(res.data.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (templates.length > 0 && currentTemplate === null) {
      setCurrentTemplate(templates[0]);
    }
  }, [templates, currentTemplate]);

  const createTemplate = useCallback(async (templateData: Omit<Template, 'id'>): Promise<Template> => {
    const res = await apiClient.post<{ success: boolean; template: Template }>('/api/templates', templateData);
    if (res.data.success && res.data.template) {
      setTemplates(prev => [...prev, res.data.template]);
      return res.data.template;
    }
    throw new Error('Failed to create template');
  }, []);

  const updateTemplate = useCallback(async (id: string, templateData: Partial<Template>): Promise<Template> => {
    const res = await apiClient.put<{ success: boolean; template: Template }>(`/api/templates/${id}`, templateData);
    if (res.data.success && res.data.template) {
      setTemplates(prev => prev.map(t => t.id === id ? res.data.template : t));
      if (currentTemplate?.id === id) {
        setCurrentTemplate(res.data.template);
      }
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(res.data.template);
      }
      return res.data.template;
    }
    throw new Error('Failed to update template');
  }, [currentTemplate, selectedTemplate]);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    const res = await apiClient.delete<{ success: boolean }>(`/api/templates/${id}`);
    if (res.data.success) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (currentTemplate?.id === id) {
        setCurrentTemplate(null);
      }
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    } else {
      throw new Error('Failed to delete template');
    }
  }, [currentTemplate, selectedTemplate]);

  return (
    <TemplateContext.Provider value={{ 
      templates, 
      currentTemplate, 
      selectedTemplate,
      setCurrentTemplate, 
      setSelectedTemplate,
      createTemplate,
      updateTemplate,
      deleteTemplate
    }}>
      {children}
    </TemplateContext.Provider>
  );
};

export default TemplateProvider;
