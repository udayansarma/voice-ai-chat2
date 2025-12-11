import { DocumentDatabase } from '../database/document-database';
import type { Persona, Template, Scenario, Mood } from '../types/api';

/**
 * Unified business logic service that wraps DocumentDatabase operations.
 * Provides a clean abstraction layer for CRUD operations on all document types.
 * Future-proofed for easy database migration via dependency injection.
 */
export class DocumentService {
  constructor(private db: DocumentDatabase) {}

  // === PERSONA OPERATIONS ===

  async createPersona(personaData: Omit<Persona, 'id'>): Promise<Persona> {
    const persona = {
      id: this.generateId(personaData.name),
      ...personaData
    };
    
    this.validatePersona(persona);
    
    this.db.upsertDocument(
      persona.id,
      'persona',
      persona.name,
      persona,
      '', // filePath not used in pure database mode
      new Date()
    );
    
    return persona;
  }

  async getPersona(id: string): Promise<Persona | null> {
    return this.db.getPersonaById(id) as Persona | null;
  }

  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
    const existing = await this.getPersona(id);
    if (!existing) {
      throw new Error(`Persona with id '${id}' not found`);
    }

    const updated = { ...existing, ...updates, id }; // Ensure ID doesn't change
    this.validatePersona(updated);
    
    this.db.upsertDocument(
      id,
      'persona',
      updated.name,
      updated,
      '',
      new Date()
    );
    
    return updated;
  }

  async deletePersona(id: string): Promise<void> {
    const existing = await this.getPersona(id);
    if (!existing) {
      throw new Error(`Persona with id '${id}' not found`);
    }
    
    this.db.deleteDocument(id, 'persona');
  }

  async listPersonas(): Promise<Persona[]> {
    return this.db.getAllPersonas();  }

  async searchPersonas(query: string): Promise<Persona[]> {
    return this.db.searchDocuments('persona', query);
  }

  // === MOOD OPERATIONS ===
  
  async createMood(moodData: Omit<Mood, 'id'>): Promise<Mood> {
    const mood = {
      id: moodData.mood, // Use mood name as ID
      ...moodData
    };
    
    this.validateMood(mood);
      // Use the mood-specific method instead of the document system
    this.db.createMood({
      id: mood.id,
      mood: mood.mood,
      description: mood.description || ''
    });
    
    return mood;
  }

  async getMood(id: string): Promise<Mood | null> {
    return this.db.getMoodById(id);
  }

  async updateMood(id: string, updates: Partial<Mood>): Promise<Mood> {
    const existing = await this.getMood(id);
    if (!existing) {
      throw new Error(`Mood with id '${id}' not found`);
    }

    const updated = { ...existing, ...updates, id }; // Ensure ID doesn't change
    this.validateMood(updated);
      // Use the mood-specific method
    this.db.updateMood(id, { 
      mood: updated.mood, 
      description: updated.description || '' 
    });
    
    return updated;
  }
  async deleteMood(id: string): Promise<void> {
    const existing = await this.getMood(id);
    if (!existing) {
      throw new Error(`Mood with id '${id}' not found`);
    }
    
    this.db.deleteMood(id);
  }

  async listMoods(): Promise<Mood[]> {
    // Convert the existing getAllMoods format to the new Mood interface
    const existingMoods = this.db.getAllMoods();
    return existingMoods.map((m: { mood: string; description: string }) => ({
      id: m.mood, // Use mood name directly as ID for simplicity and consistency
      mood: m.mood,
      description: m.description
    }));
  }

  async searchMoods(query: string): Promise<Mood[]> {
    const allMoods = await this.listMoods();
    return allMoods.filter(mood => 
      mood.mood.toLowerCase().includes(query.toLowerCase()) ||
      (mood.description && mood.description.toLowerCase().includes(query.toLowerCase()))
    );
  }

  // === TEMPLATE OPERATIONS ===
  async createTemplate(templateData: Omit<Template, 'id'>): Promise<Template> {
    const template = {
      id: this.generateId(templateData.name),
      ...templateData
    };
    
    this.validateTemplate(template);
    
    // Map prompt -> content for database storage
    const dbTemplate = {
      ...template,
      content: template.prompt, // Map prompt -> content for database
      prompt: undefined // Remove prompt field for database
    };
    
    this.db.upsertDocument(
      template.id,
      'prompt_template',
      template.name,
      dbTemplate,
      '',
      new Date()
    );
    
    return template;
  }
  async getTemplate(id: string): Promise<Template | null> {
    const template = await this.db.getTemplateById(id);
    if (!template) return null;
    
    // Map database format to client-expected format
    return {
      id: template.id,
      name: template.name,
      prompt: template.content || template.prompt, // Map content -> prompt
      description: template.description
    };
  }
  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    const existing = await this.getTemplate(id);
    if (!existing) {
      throw new Error(`Template with id '${id}' not found`);
    }

    // Always use the latest prompt value from updates, fallback to existing
    const prompt = updates.prompt !== undefined ? updates.prompt : existing.prompt;
    const updated: Template = {
      ...existing,
      ...updates,
      id,
      prompt: prompt || ''
    };
    this.validateTemplate(updated);

    // Map prompt -> content for database storage, remove prompt field
    const dbTemplate: any = {
      ...updated,
      content: updated.prompt,
    };
    // Remove prompt field if present
    if ('prompt' in dbTemplate) {
      dbTemplate.prompt = undefined;
    }

    this.db.upsertDocument(
      id,
      'prompt_template',
      updated.name,
      dbTemplate,
      '',
      new Date()
    );

    // Always return the correct shape (with prompt field)
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.getTemplate(id);
    if (!existing) {
      throw new Error(`Template with id '${id}' not found`);
    }
    
    this.db.deleteDocument(id, 'prompt_template');
  }
  async listTemplates(): Promise<Template[]> {
    const templates = await this.db.getAllTemplates();
    // Map database format to client-expected format
    return templates.map((template: any): Template => ({
      id: template.id,
      name: template.name,
      prompt: template.content || template.prompt, // Map content -> prompt
      description: template.description
    }));
  }
  async searchTemplates(query: string): Promise<Template[]> {
    return this.db.searchDocuments('prompt_template', query);
  }

  // === SCENARIO OPERATIONS ===

  async createScenario(scenarioData: Omit<Scenario, 'id'>): Promise<Scenario> {
    const title = (scenarioData as any).title || 'scenario';
    const id = this.generateId(title);
    const scenario = {
      id,
      ...scenarioData
    } as Scenario;
    
    this.validateScenario(scenario);
    
    this.db.upsertDocument(
      scenario.id,
      'scenario',
      scenario.title,
      scenario,
      '',
      new Date()
    );
    
    return scenario;
  }

  async getScenario(id: string): Promise<Scenario | null> {
    return this.db.getScenarioById(id) as Scenario | null;
  }

  async updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario> {
    const existing = await this.getScenario(id);
    if (!existing) {
      throw new Error(`Scenario with id '${id}' not found`);
    }

    const updated = { ...existing, ...updates, id }; // Ensure ID doesn't change
    this.validateScenario(updated);
    
    this.db.upsertDocument(
      id,
      'scenario',
      updated.title,
      updated,
      '',
      new Date()
    );
    
    return updated;
  }

  async deleteScenario(id: string): Promise<void> {
    const existing = await this.getScenario(id);
    if (!existing) {
      throw new Error(`Scenario with id '${id}' not found`);
    }
    
    this.db.deleteDocument(id, 'scenario');
  }

  async listScenarios(): Promise<Scenario[]> {
    return this.db.getAllScenarios();
  }
  // === VALIDATION METHODS ===
  private validatePersona(persona: Persona): void {
    if (!persona.name || persona.name.trim().length === 0) {
      throw new Error('Persona name is required');
    }
    if (!persona.id || persona.id.trim().length === 0) {
      throw new Error('Persona ID is required');
    }
    // Add more validation as needed
  }

  private validateMood(mood: Mood): void {
    if (!mood.mood || mood.mood.trim().length === 0) {
      throw new Error('Mood name is required');
    }
    if (!mood.id || mood.id.trim().length === 0) {
      throw new Error('Mood ID is required');
    }
    // Add more validation as needed
  }

  private validateTemplate(template: Template): void {
    if (!template.name || template.name.trim().length === 0) {
      throw new Error('Template name is required');
    }
    if (!template.id || template.id.trim().length === 0) {
      throw new Error('Template ID is required');
    }
    if (!template.prompt || template.prompt.trim().length === 0) {
      throw new Error('Template prompt is required');
    }
    // Add more validation as needed
  }

  private validateScenario(scenario: Scenario): void {
    if (!scenario.id || scenario.id.trim().length === 0) {
      throw new Error('Scenario ID is required');
    }
    if (!scenario.title || scenario.title.trim().length === 0) {
      throw new Error('Scenario title is required');
    }
    // Add more validation as needed
  }

  // === UTILITY METHODS ===

  private generateStableId(name: string): string {
    // Generate a stable, URL-friendly ID from the name (no timestamp)
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private generateId(name: string): string {
    // Generate a URL-friendly ID from the name
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) + '_' + Date.now().toString(36);
  }

  // === DATABASE MANAGEMENT ===

  isReady(): boolean {
    return this.db.isReady();
  }

  getStats(): any {
    return this.db.getDocumentStats();
  }

  close(): void {
    this.db.close();
  }
}
