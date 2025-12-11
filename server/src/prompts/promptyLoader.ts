import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface PrompyConfiguration {
  type: string;
  azure_endpoint?: string;
  azure_deployment?: string;
  api_version?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface PrompyModel {
  api: string;
  configuration: PrompyConfiguration;
}

interface PrompyMetadata {
  name: string;
  description: string;
  authors: string[];
  model: PrompyModel;
  parameters: Record<string, string>;
}

interface PrompyTemplate {
  metadata: PrompyMetadata;
  content: string;
}

export class PrompyLoader {
  // Public wrapper to render a template from a string (for DB-backed templates)
  public static renderTemplateFromContent(
    content: string,
    name: string,
    description: string,
    parameters: Record<string, any>
  ): { systemMessage: string; configuration: PrompyConfiguration } {
    // Use a minimal metadata object for compatibility
    const template: PrompyTemplate = {
      metadata: {
        name,
        description,
        authors: [],
        model: { api: '', configuration: { type: 'custom' } },
        parameters: {}
      },
      content
    };
    return this.renderTemplateContent(template, parameters);
  }
  private static parseTemplate(filePath: string): PrompyTemplate {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Split frontmatter and content - more robust parsing
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = fileContent.match(frontmatterRegex);
    
    if (!match) {
      // Fallback to original parsing method
      const parts = fileContent.split('---');
      if (parts.length < 3) {
        throw new Error('Invalid Prompty file format: missing frontmatter');
      }
      
      const frontmatter = parts[1];
      const content = parts.slice(2).join('---').trim();
      
      try {
        const metadata = yaml.load(frontmatter) as PrompyMetadata;
        return { metadata, content };
      } catch (error) {
        throw new Error(`Failed to parse Prompty frontmatter: ${error}`);
      }
    }
    
    const frontmatter = match[1];
    const content = match[2].trim();
    
    try {
      const metadata = yaml.load(frontmatter) as PrompyMetadata;
      return { metadata, content };
    } catch (error) {
      throw new Error(`Failed to parse Prompty frontmatter: ${error}`);
    }
  }
  
  public static loadTemplate(templateName: string): PrompyTemplate {
    // Try loading from dist/prompts first
    let filePath = path.join(__dirname, '..', 'prompts', `${templateName}.prompty`);
    // Fallback to source folder when running compiled code
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'src', 'prompts', `${templateName}.prompty`);
    }
    if (!fs.existsSync(filePath)) {
      throw new Error(`Prompty template not found: ${filePath}`);
    }
    return this.parseTemplate(filePath);
  }
  
  public static renderTemplate(
    templateName: string,
    parameters: Record<string, any>
  ): { systemMessage: string; configuration: PrompyConfiguration } {
    console.log('renderTemplate called with:', { templateName, parameters });
    const template = this.loadTemplate(templateName);
    console.log('Template content:', template.content);
    
    // Simple template rendering (replace {{variable}} with values)
    let renderedContent = template.content;
      // Handle conditional blocks {% if variable %}...{% endif %}
    Object.keys(parameters).forEach(key => {
      const value = parameters[key];
      console.log(`Substituting ${key}:`, value);
      
      // Replace {% if key %} blocks
      const ifPattern = new RegExp(`{% if ${key} %}([\\s\\S]*?){% endif %}`, 'g');
      if (value) {
        renderedContent = renderedContent.replace(ifPattern, '$1');
      } else {
        renderedContent = renderedContent.replace(ifPattern, '');
      }
      
      // Replace {{key}} placeholders with actual values - only if placeholder exists
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      if (renderedContent.match(placeholder)) {
        renderedContent = renderedContent.replace(placeholder, String(value || ''));
      }
    });
    
    console.log('Rendered content:', renderedContent);
    
    // Clean up any remaining template syntax
    renderedContent = renderedContent.replace(/{% if \w+ %}|{% endif %}/g, '');
    const finalContent = renderedContent.replace(/{{[\w_]+}}/g, '');
    console.log('Final content after cleanup:', finalContent);
    
    // Resolve environment variables in configuration
    const resolvedConfig = { ...template.metadata.model.configuration };
    Object.keys(resolvedConfig).forEach(key => {
      const value = resolvedConfig[key as keyof PrompyConfiguration];
      if (typeof value === 'string' && value.startsWith('${env:')) {
        const envVar = value.slice(6, -1); // Remove ${env: and }
        (resolvedConfig as any)[key] = process.env[envVar] || value;
      }
    });
    
    return {
      systemMessage: renderedContent.trim(),
      configuration: resolvedConfig
    };
  }
  
  public static loadTemplateFromPath(filePath: string, parameters?: Record<string, any>): { systemMessage: string; configuration: PrompyConfiguration } {
    let resolvedPath = filePath;
    
    // Try the direct path first
    if (!fs.existsSync(resolvedPath)) {
      // If we're in dist folder, try to find it in source
      if (resolvedPath.includes('/dist/') || resolvedPath.includes('\\dist\\')) {
        const fileName = path.basename(resolvedPath);
        const srcPath = resolvedPath.replace(
          path.join('dist', path.sep), 
          path.join('src', path.sep)
        );
        
        if (fs.existsSync(srcPath)) {
          console.log(`Template found at source path: ${srcPath}`);
          resolvedPath = srcPath;
        } else {
          // As a last resort, check if it's in the prompts directory
          const promptsPath = path.join(process.cwd(), 'src', 'prompts', fileName);
          if (fs.existsSync(promptsPath)) {
            console.log(`Template found in prompts directory: ${promptsPath}`);
            resolvedPath = promptsPath;
          }
        }
      }
    }
    
    // If still not found, throw error
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Prompty template not found: ${filePath}`);
    }
    
    const template = this.parseTemplate(resolvedPath);
    
    if (parameters) {
      // Render template with parameters
      return this.renderTemplateContent(template, parameters);
    }
    
    return {
      systemMessage: template.content,
      configuration: template.metadata.model.configuration
    };
  }

  private static renderTemplateContent(
    template: PrompyTemplate,
    parameters: Record<string, any>
  ): { systemMessage: string; configuration: PrompyConfiguration } {
    // Simple template rendering (replace {{variable}} with values)
    let renderedContent = template.content;
    
    // Handle conditional blocks {% if variable %}...{% endif %}
    Object.keys(parameters).forEach(key => {
      const value = parameters[key];
      
      // Replace {% if key %} blocks
      const ifPattern = new RegExp(`{% if ${key} %}([\\s\\S]*?){% endif %}`, 'g');
      if (value) {
        renderedContent = renderedContent.replace(ifPattern, '$1');
      } else {
        renderedContent = renderedContent.replace(ifPattern, '');
      }
      
      // Replace {{key}} placeholders with actual values
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      if (renderedContent.match(placeholder)) {
        renderedContent = renderedContent.replace(placeholder, String(value || ''));
      }
    });
    
    // Clean up any remaining template syntax
    renderedContent = renderedContent.replace(/{% if \w+ %}|{% endif %}/g, '');
    const finalContent = renderedContent.replace(/{{[\w_]+}}/g, '');
    
    // Resolve environment variables in configuration
    const resolvedConfig = { ...template.metadata.model.configuration };
    Object.keys(resolvedConfig).forEach(key => {
      const value = resolvedConfig[key as keyof PrompyConfiguration];
      if (typeof value === 'string' && value.startsWith('${env:')) {
        const envVar = value.slice(6, -1); // Remove ${env: and }
        (resolvedConfig as any)[key] = process.env[envVar] || value;
      }
    });
    
    return {
      systemMessage: finalContent.trim(),
      configuration: resolvedConfig
    };
  }
}

export { PrompyTemplate, PrompyMetadata, PrompyConfiguration };
