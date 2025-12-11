import * as path from 'path';
import * as fs from 'fs';
import { PrompyLoader } from '../prompts/promptyLoader';
import { databaseServiceFactory } from './database-service-factory';
import type { Template } from '../types/api';

/**
 * Get all templates - uses DocumentService if available, falls back to database or files
 */
export async function getAllTemplates(dbInstance?: any): Promise<Template[]> {
  try {
    // Try DocumentService first
    const documentService = databaseServiceFactory.getDocumentService();
    console.log('DocumentService available (templates):', !!documentService);
    
    if (documentService) {
      const templates = await documentService.listTemplates();
      console.log('DocumentService returned templates count:', templates.length);
      return templates;
    }
    
    // Fallback to database
    const db = dbInstance ?? (databaseServiceFactory.shouldUseDatabase() ? databaseServiceFactory.getDatabase() : null);
    console.log('Database available (templates):', !!db);
    
    if (db) {
      const templates: any[] = db.getAllTemplates();
      console.log('Database returned templates count:', templates.length);
      return templates.map((template: any): Template => ({
        id: template.id || template.name,
        name: template.metadata?.name || template.name,
        description: template.metadata?.description || template.description,
        prompt: template.content,
        metadata: template.metadata,
        ...template
      }));
    }
    
    // Fallback to file system
    console.log('📁 Falling back to file-based template retrieval');
    return getTemplatesFromFiles();
    
  } catch (error) {
    console.error('❌ Error retrieving templates from database, falling back to files:', error);
    return getTemplatesFromFiles();
  }
}

/**
 * Get template by ID - uses DocumentService if available, falls back to database or files
 */
export async function getTemplateById(id: string, dbInstance?: any): Promise<Template | null> {
  try {
    // Try DocumentService first
    const documentService = databaseServiceFactory.getDocumentService();
    if (documentService) {
      return await documentService.getTemplate(id);
    }
    
    // Fallback to database
    const db = dbInstance ?? (databaseServiceFactory.shouldUseDatabase() ? databaseServiceFactory.getDatabase() : null);
    if (db) {
      const template: any = db.getTemplateById(id);
      if (template) {
        return {
          id: template.id || id,
          name: template.metadata?.name || template.name,
          description: template.metadata?.description || template.description,
          prompt: template.content,
          metadata: template.metadata,
          ...template
        };
      }
    }
    return getTemplateFromFile(id);
  } catch (error) {
    return getTemplateFromFile(id);
  }
}

/**
 * Search templates by term - uses DocumentService if available, falls back to database or files
 */
export async function searchTemplates(searchTerm: string, dbInstance?: any): Promise<Template[]> {
  try {
    // Try DocumentService first
    const documentService = databaseServiceFactory.getDocumentService();
    if (documentService) {
      return await documentService.searchTemplates(searchTerm);
    }
    
    // Fallback to database
    const db = dbInstance ?? (databaseServiceFactory.shouldUseDatabase() ? databaseServiceFactory.getDatabase() : null);
    if (db) {
      const results: any[] = db.searchDocuments('prompt_template', searchTerm);
      return results.map((template: any): Template => ({
        id: template.id || template.name,
        name: template.metadata?.name || template.name,
        description: template.metadata?.description || template.description,
        prompt: template.content,
        metadata: template.metadata,
        ...template
      }));
    }
    const allTemplates = getTemplatesFromFiles();
    return allTemplates.filter((template: any) => 
      JSON.stringify(template).toLowerCase().includes(searchTerm.toLowerCase())
    );
  } catch (error) {
    return [];
  }
}

/**
 * Get templates by model type - uses DocumentService if available, falls back to database or files
 */
export async function getTemplatesByModel(modelType: string, dbInstance?: any): Promise<Template[]> {
  try {
    // Try DocumentService first
    const documentService = databaseServiceFactory.getDocumentService();
    if (documentService) {
      const allTemplates = await documentService.listTemplates();
      return allTemplates.filter((template: any) => 
        template.metadata?.model?.api?.toLowerCase().includes(modelType.toLowerCase()) ||
        template.model?.api?.toLowerCase().includes(modelType.toLowerCase())
      );
    }
    
    // Fallback to database
    const db = dbInstance ?? (databaseServiceFactory.shouldUseDatabase() ? databaseServiceFactory.getDatabase() : null);
    if (db) {
      const allTemplates: any[] = db.getAllTemplates();
      const results = allTemplates.filter((template: any) => 
        template.metadata?.model?.api?.toLowerCase().includes(modelType.toLowerCase()) ||
        template.model?.api?.toLowerCase().includes(modelType.toLowerCase())
      );
      return results.map((template: any): Template => ({
        id: template.id || template.name,
        name: template.metadata?.name || template.name,
        description: template.metadata?.description || template.description,
        prompt: template.content,
        metadata: template.metadata,
        ...template
      }));
    }
    const allTemplates = getTemplatesFromFiles();
    return allTemplates.filter((template: any) => 
      template.metadata?.model?.api?.toLowerCase().includes(modelType.toLowerCase())
    );
  } catch (error) {
    return [];
  }
}

/**
 * Get all template names (IDs and names) from the database if available
 */
export async function getAllTemplateNames(): Promise<Array<{ id: string; name: string }>> {
  if (databaseServiceFactory.shouldUseDatabase()) {
    const db = databaseServiceFactory.getDatabase();
    if (db && typeof (db as any).getAllTemplateNames === 'function') {
      return (db as any).getAllTemplateNames();
    }
  }
  return [];
}

// File-based implementation functions (private)
function getTemplatesFromFiles(): any[] {
  const promptsDir = resolvePromptsDir();
  const files = fs.readdirSync(promptsDir).filter(file => file.endsWith('.prompty'));
  const templates: any[] = [];
  
  for (const file of files) {
    const templateName = path.basename(file, '.prompty');
    try {
      const { metadata, content } = PrompyLoader.loadTemplate(templateName);
      templates.push({
        id: templateName,
        name: metadata.name,
        description: metadata.description,
        prompt: content,
        content,
        metadata
      });
    } catch (error) {
      console.warn(`Failed to load template file ${file}:`, error);
    }
  }
  
  return templates;
}

function getTemplateFromFile(id: string): any | null {
  try {
    const { metadata, content } = PrompyLoader.loadTemplate(id);
    return {
      id,
      name: metadata.name,
      description: metadata.description,
      prompt: content,
      content,
      metadata
    };
  } catch (error) {
    console.warn(`Failed to load template '${id}':`, error);
    return null;
  }
}

function resolvePromptsDir(): string {
  return databaseServiceFactory.resolvePromptsDir();
}
