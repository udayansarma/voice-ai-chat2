import { DocumentDatabase } from './document-database';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationResult {
  success: boolean;
  personasCount: number;
  templatesCount: number;
  moodsCount: number;
  scenariosCount: number;
  errors: string[];
}

export class DatabaseMigration {
  private db: DocumentDatabase;
  private personasDir: string;
  private promptsDir: string;
  private scenariosDir: string;
  private moodsFile: string;
  private constructor(db: DocumentDatabase) {
    this.db = db;
    // In production containers, the source directories are copied to /app/src/
    // In development, they're in the src directory relative to project root
    const isProduction = process.env.NODE_ENV === 'production' || process.cwd() === '/app';
    const baseDir = isProduction ? path.join(process.cwd(), 'src') : path.join(process.cwd(), 'src');
    this.personasDir = path.join(baseDir, 'personas');
    this.promptsDir = path.join(baseDir, 'prompts');
    this.scenariosDir = path.join(baseDir, 'scenarios');
    this.moodsFile = path.join(baseDir, 'util', 'moods.json');
  }

  static async create(dbPath?: string): Promise<DatabaseMigration> {
    const db = await DocumentDatabase.create(dbPath);
    return new DatabaseMigration(db);
  }
  async migrateFromFiles(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      personasCount: 0,
      templatesCount: 0,
      moodsCount: 0,
      scenariosCount: 0,
      errors: []
    };console.log('Starting migration from files to database...');

    // Wait for database to be ready
    let retries = 0;
    while (!this.db.isReady() && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }

    if (!this.db.isReady()) {
      result.errors.push('Database failed to initialize within timeout');
      return result;
    }

    try {
      // Migrate personas
      if (fs.existsSync(this.personasDir)) {
        const personaFiles = fs.readdirSync(this.personasDir)
          .filter(f => f.endsWith('.json'));
        
        console.log(`Found ${personaFiles.length} persona files to migrate`);
        
        for (const file of personaFiles) {
          try {
            const id = path.basename(file, '.json');
            const filePath = path.join(this.personasDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const document = JSON.parse(fileContent);
            const stats = fs.statSync(filePath);
            
            this.db.upsertDocument(
              id,
              'persona',
              document.name || id,
              document,
              filePath,
              stats.mtime
            );
            
            result.personasCount++;
            console.log(`✅ Migrated persona: ${id}`);
          } catch (error) {
            const errorMsg = `Failed to migrate persona ${file}: ${error}`;
            result.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      } else {
        console.log('Personas directory not found, skipping persona migration');
      }

      // Migrate prompt templates
      if (fs.existsSync(this.promptsDir)) {
        const promptFiles = fs.readdirSync(this.promptsDir)
          .filter(f => f.endsWith('.prompty'));
        
        console.log(`Found ${promptFiles.length} prompt template files to migrate`);
        
        for (const file of promptFiles) {
          try {
            const id = path.basename(file, '.prompty');
            const filePath = path.join(this.promptsDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const stats = fs.statSync(filePath);
              // Parse prompty file (basic YAML frontmatter parsing)
            const document = this.parsePromptyFile(fileContent);
            
            // Debug logging to see what was parsed
            console.log(`Debug - Parsing ${file}:`);
            console.log(`  - Extracted name: "${document.name}"`);
            console.log(`  - Metadata name: "${document.metadata?.name}"`);
            console.log(`  - Fallback id: "${id}"`);
            
            // Use the name from frontmatter if available, else fallback to id
            const templateName = document.name || document.metadata?.name || id;
            console.log(`  - Final template name: "${templateName}"`);
            
            this.db.upsertDocument(
              id,
              'prompt_template',
              templateName,
              document,
              filePath,
              stats.mtime
            );
            
            result.templatesCount++;
            console.log(`✅ Migrated template: ${id}`);
          } catch (error) {
            const errorMsg = `Failed to migrate template ${file}: ${error}`;
            result.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }      } else {
        console.log('Prompts directory not found, skipping template migration');
      }

      // Migrate moods
      if (fs.existsSync(this.moodsFile)) {
        try {
          console.log('Found moods.json file to migrate');
          const fileContent = fs.readFileSync(this.moodsFile, 'utf-8');
          const moodsArray = JSON.parse(fileContent);
          const stats = fs.statSync(this.moodsFile);
          
          if (Array.isArray(moodsArray)) {
            for (const mood of moodsArray) {
              try {
                const id = mood.mood.toLowerCase().replace(/\s+/g, '-');
                this.db.upsertDocument(
                  id,
                  'mood',
                  mood.mood,
                  mood,
                  this.moodsFile,
                  stats.mtime
                );
                
                result.moodsCount++;
                console.log(`✅ Migrated mood: ${mood.mood}`);
              } catch (error) {
                const errorMsg = `Failed to migrate mood ${mood.mood}: ${error}`;
                result.errors.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
              }
            }
          } else {
            result.errors.push('moods.json does not contain an array');
          }
        } catch (error) {
          const errorMsg = `Failed to read moods.json: ${error}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      } else {
        console.log('Moods file not found, skipping mood migration');
      }

      // Migrate scenarios
      if (fs.existsSync(this.scenariosDir)) {
        const scenarioFiles = fs.readdirSync(this.scenariosDir)
          .filter(f => f.endsWith('.json'));
        
        console.log(`Found ${scenarioFiles.length} scenario files to migrate`);
        
        for (const file of scenarioFiles) {
          try {
            const fileBaseId = path.basename(file, '.json');
            const filePath = path.join(this.scenariosDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const docObj = JSON.parse(fileContent);
            const stats = fs.statSync(filePath);
            // Use JSON id field if available, otherwise fallback to filename
            const jsonId = typeof docObj.id === 'string' && docObj.id.trim() ? docObj.id : fileBaseId;
            const scenarioName = docObj.title || docObj.name || jsonId;
            // Insert using JSON id to support individual lookups
            this.db.upsertDocument(
              jsonId,
              'scenario',
              scenarioName,
              docObj,
              filePath,
              stats.mtime
            );
            result.scenariosCount++;
            console.log(`✅ Migrated scenario: ${jsonId}`);
          } catch (error) {
            const errorMsg = `Failed to migrate scenario ${file}: ${error}`;
            result.errors.push(errorMsg);
            console.error(`❌ ${errorMsg}`);
          }
        }
      } else {
        console.log('Scenarios directory not found, skipping scenario migration');
      }

      // Check final results
      const stats = this.db.getDocumentStats();      console.log('\nMigration completed!');
      console.log(`- Personas migrated: ${result.personasCount}`);
      console.log(`- Templates migrated: ${result.templatesCount}`);
      console.log(`- Moods migrated: ${result.moodsCount}`);
      console.log(`- Scenarios migrated: ${result.scenariosCount}`);
      console.log(`- Total in database: ${stats.total}`);
      console.log(`- Errors: ${result.errors.length}`);

      result.success = result.errors.length === 0;

      if (result.errors.length > 0) {
        console.log('\nErrors encountered:');
        result.errors.forEach(error => console.log(`- ${error}`));
      }

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      console.error('Migration failed:', error);
    }

    return result;
  }
  private parsePromptyFile(content: string): any {
    try {
      // Split frontmatter and content
      const parts = content.split('---');
      
      if (parts.length < 3) {
        // No frontmatter, treat entire content as prompt
        return {
          metadata: {},
          content: content.trim()
        };
      }

      // Parse YAML frontmatter (improved parsing)
      const frontmatter = parts[1].trim();
      const promptContent = parts.slice(2).join('---').trim();
      
      const metadata: any = {};
        // Improved YAML parsing that respects nesting levels
      const lines = frontmatter.split('\n');
      let currentSection: string | null = null;
      let indentLevel = 0;
      
      console.log(`  Parsing frontmatter with ${lines.length} lines:`);
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        
        const lineIndent = line.length - line.trimStart().length;
        const colonIndex = trimmedLine.indexOf(':');
        
        if (colonIndex > 0) {
          const key = trimmedLine.substring(0, colonIndex).trim();
          const value = trimmedLine.substring(colonIndex + 1).trim();
          
          console.log(`    Line: "${line}" | Indent: ${lineIndent} | Key: "${key}" | Value: "${value}"`);
            // Only process top-level keys (indentation level 0 only)
          if (lineIndent === 0) {
            currentSection = key;
            indentLevel = lineIndent;
            
            // Remove quotes if present
            const cleanValue = value.replace(/^['"](.*)['"]$/, '$1');
            
            console.log(`      -> Processing top-level key "${key}" with clean value: "${cleanValue}"`);
            
            // Handle arrays (basic)
            if (cleanValue.startsWith('[') && cleanValue.endsWith(']')) {
              metadata[key] = cleanValue.slice(1, -1).split(',').map(v => v.trim().replace(/^['"](.*)['"]$/, '$1'));
              console.log(`      -> Set array: ${key} = [${metadata[key].join(', ')}]`);
            } else if (cleanValue) {
              // Only set value if it's not empty (avoid nested sections)
              metadata[key] = cleanValue;
              console.log(`      -> Set value: ${key} = "${cleanValue}"`);
            }
          } else {
            console.log(`      -> Skipping nested key "${key}" (indent: ${lineIndent})`);
          }
          // Skip nested properties (like sample.name, inputs.persona, etc.)
        }
      }

      return {
        metadata,
        content: promptContent,
        // Flatten for easier access
        name: metadata.name,
        description: metadata.description,
        authors: metadata.authors,
        model: metadata.model,
        parameters: metadata.parameters
      };
    } catch (error) {
      console.warn('Failed to parse prompty file, using content as-is:', error);
      return {
        metadata: {},
        content: content,
        name: 'Unknown Template'
      };
    }
  }

  close(): void {
    this.db.close();
  }
}

// Migration script
async function runMigration(): Promise<void> {
  console.log('🚀 Starting database migration...\n');
  
  const migration = await DatabaseMigration.create();
  
  try {
    const result = await migration.migrateFromFiles();
    
    if (result.success) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with errors.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  } finally {
    migration.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration().catch(console.error);
}
