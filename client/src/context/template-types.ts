// Shared types for TemplateContext
export interface Template {
  id: string;
  name: string;
  prompt: string;
}

export interface TemplateContextData {
  templates: Template[];
  currentTemplate: Template | null;
  setCurrentTemplate: (template: Template) => void;
}
