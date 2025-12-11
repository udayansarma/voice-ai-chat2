import React, { createContext } from 'react';
import type { Template } from './template-types';

export interface TemplateContextData {
  templates: Template[];
  currentTemplate: Template | null;
  selectedTemplate: Template | null;
  setCurrentTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  createTemplate: (templateData: Omit<Template, 'id'>) => Promise<Template>;
  updateTemplate: (id: string, templateData: Partial<Template>) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const TemplateContext = createContext<TemplateContextData>({
  templates: [],
  currentTemplate: null,
  selectedTemplate: null,
  setCurrentTemplate: () => {},
  setSelectedTemplate: () => {},
  createTemplate: async () => { throw new Error('TemplateContext not initialized'); },
  updateTemplate: async () => { throw new Error('TemplateContext not initialized'); },
  deleteTemplate: async () => { throw new Error('TemplateContext not initialized'); },
});
