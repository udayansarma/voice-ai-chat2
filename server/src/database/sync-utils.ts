import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

export interface FileInfo {
  id: string;
  name: string;
  filePath: string;
  modified: Date;
  size: number;
  type: 'persona' | 'prompt_template';
}

export interface ParsedPromptyFile {
  metadata: Record<string, any>;
  content: string;
  name: string;
  description?: string;
  authors?: string[];
  model?: any;
  parameters?: Record<string, any>;
}

export class SyncUtils {
  
  /**
   * Get information about all persona files in a directory
   */
  static getPersonaFiles(personasDir: string): FileInfo[] {
    if (!fs.existsSync(personasDir)) {
      return [];
    }

    const files: FileInfo[] = [];
    const personaFiles = fs.readdirSync(personasDir).filter(f => f.endsWith('.json'));

    for (const file of personaFiles) {
      try {
        const filePath = path.join(personasDir, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const persona = JSON.parse(content);

        files.push({
          id: path.basename(file, '.json'),
          name: persona.name || path.basename(file, '.json'),
          filePath,
          modified: stats.mtime,
          size: stats.size,
          type: 'persona'
        });
      } catch (error) {
        console.warn(`Failed to read persona file ${file}:`, error);
      }
    }

    return files;
  }

  /**
   * Get information about all prompt template files in a directory
   */
  static getPromptFiles(promptsDir: string): FileInfo[] {
    if (!fs.existsSync(promptsDir)) {
      return [];
    }

    const files: FileInfo[] = [];
    const promptFiles = fs.readdirSync(promptsDir).filter(f => f.endsWith('.prompty'));

    for (const file of promptFiles) {
      try {
        const filePath = path.join(promptsDir, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = this.parsePromptyFile(content);

        files.push({
          id: path.basename(file, '.prompty'),
          name: parsed.name || path.basename(file, '.prompty'),
          filePath,
          modified: stats.mtime,
          size: stats.size,
          type: 'prompt_template'
        });
      } catch (error) {
        console.warn(`Failed to read prompt file ${file}:`, error);
      }
    }

    return files;
  }

  /**
   * Parse a prompty file into structured data
   */
  static parsePromptyFile(content: string): ParsedPromptyFile {
    try {
      // Split frontmatter and content
      const parts = content.split('---');
      
      if (parts.length < 3) {
        // No frontmatter, treat entire content as prompt
        return {
          metadata: {},
          content: content.trim(),
          name: 'Unknown Template'
        };
      }

      // Parse YAML frontmatter
      const frontmatter = parts[1].trim();
      const promptContent = parts.slice(2).join('---').trim();
      
      const metadata = this.parseBasicYaml(frontmatter);

      return {
        metadata,
        content: promptContent,
        name: metadata.name || 'Unknown Template',
        description: metadata.description,
        authors: metadata.authors,
        model: metadata.model,
        parameters: metadata.parameters
      };
    } catch (error) {
      console.warn('Failed to parse prompty file:', error);
      return {
        metadata: {},
        content: content,
        name: 'Unknown Template'
      };
    }
  }

  /**
   * Basic YAML parser for frontmatter (now using js-yaml for robust parsing)
   */
  private static parseBasicYaml(yamlString: string): Record<string, any> {
    try {
      return yaml.load(yamlString) as Record<string, any>;
    } catch (err) {
      console.warn('Failed to parse YAML frontmatter:', err);
      return {};
    }
  }

  /**
   * Parse individual YAML values
   */
  private static parseYamlValue(value: string): any {
    // Remove quotes if present
    let cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
    
    // Handle arrays (basic)
    if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
      return cleanValue.slice(1, -1)
        .split(',')
        .map(v => v.trim().replace(/^['"](.*)['"]$/, '$1'))
        .filter(v => v.length > 0);
    }
    
    // Handle objects (very basic)
    if (cleanValue.startsWith('{') && cleanValue.endsWith('}')) {
      try {
        return JSON.parse(cleanValue);
      } catch {
        return cleanValue;
      }
    }
    
    // Handle booleans
    if (cleanValue === 'true') return true;
    if (cleanValue === 'false') return false;
    
    // Handle null/undefined
    if (cleanValue === 'null' || cleanValue === '~') return null;
    
    // Handle numbers
    if (!isNaN(Number(cleanValue)) && cleanValue !== '') {
      return Number(cleanValue);
    }
    
    return cleanValue;
  }

  /**
   * Check if a file has been modified since a given date
   */
  static isFileModifiedSince(filePath: string, since: Date): boolean {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime > since;
    } catch (error) {
      // File doesn't exist or can't be accessed
      return false;
    }
  }

  /**
   * Get file modification time
   */
  static getFileModificationTime(filePath: string): Date | null {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate persona JSON structure
   */
  static validatePersonaStructure(persona: any): boolean {
    if (!persona || typeof persona !== 'object') {
      return false;
    }

    // Check for required fields (basic validation)
    return typeof persona.name === 'string' && persona.name.length > 0;
  }

  /**
   * Validate prompt template structure
   */
  static validatePromptStructure(template: any): boolean {
    if (!template || typeof template !== 'object') {
      return false;
    }

    // Check for required fields
    return (
      typeof template.content === 'string' && 
      template.content.length > 0 &&
      (typeof template.name === 'string' && template.name.length > 0)
    );
  }

  /**
   * Generate a safe filename from a document name
   */
  static generateSafeFilename(name: string, extension: string): string {
    // Remove invalid characters and replace spaces with hyphens
    const safeName = name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    
    return `${safeName}.${extension}`;
  }

  /**
   * Calculate file hash for change detection
   */
  static calculateFileHash(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Simple hash based on content length and first/last characters
      const hash = content.length + 
        (content.charCodeAt(0) || 0) + 
        (content.charCodeAt(content.length - 1) || 0);
      return hash.toString(36);
    } catch (error) {
      return 'error';
    }
  }
}
