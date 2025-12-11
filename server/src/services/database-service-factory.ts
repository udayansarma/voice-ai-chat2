import { FileSyncDatabase } from '../database/file-sync-database';
import { DocumentDatabase } from '../database/document-database';
import { DocumentService } from './DocumentService';
import * as path from 'path';
import * as fs from 'fs';

export interface DatabaseServiceConfig {
  useDatabaseByDefault: boolean;
  fallbackToFiles: boolean;
  dbPath?: string;
  personasDir: string;
  templatesDir: string;
}

/**
 * Factory class for creating database-backed or file-backed services
 * based on environment and configuration
 */
export class DatabaseServiceFactory {
  private static instance: DatabaseServiceFactory;
  private database: FileSyncDatabase | DocumentDatabase | null = null;
  private documentService: DocumentService | null = null;
  private config: DatabaseServiceConfig;
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;

  private constructor() {    // Default configuration
    const defaultPersistentDbPath = process.env.WEBSITE_SITE_NAME
      ? '/home/site/data/voice-ai-documents.db' // Azure App Service persistent storage
      : path.join(process.cwd(), 'data', 'voice-ai-documents.db'); // Local/dev fallback

    this.config = {
      useDatabaseByDefault: process.env.NODE_ENV !== 'development',
      fallbackToFiles: true,
      // Precedence: explicit SQLITE_DB_PATH > legacy DATABASE_PATH > environment specific default
      dbPath: process.env.SQLITE_DB_PATH || process.env.DATABASE_PATH || defaultPersistentDbPath,
      personasDir: DatabaseServiceFactory.resolvePersonasDir(),
      templatesDir: DatabaseServiceFactory.resolvePromptsDir()
    };
    console.log('[DatabaseServiceFactory] Initial DB path configured:', this.config.dbPath);
  }

  public static getInstance(): DatabaseServiceFactory {
    if (!DatabaseServiceFactory.instance) {
      DatabaseServiceFactory.instance = new DatabaseServiceFactory();
    }
    return DatabaseServiceFactory.instance;
  }

  public configure(config: Partial<DatabaseServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.dbPath) {
      console.log('[DatabaseServiceFactory] DB path overridden via configure():', this.config.dbPath);
    }
  }

  public getConfiguredPath(): string | undefined {
    return this.config.dbPath;
  }

  public async initializeDatabase(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeDatabase();
    return this.initializationPromise;
  }

  private async _initializeDatabase(): Promise<void> {
    try {
      console.log('🔧 Initializing database service...');
      const dbPath = this.config.dbPath || path.join(process.cwd(), 'data', 'voice-ai-documents.db');
      // Ensure the data directory exists before initializing the database
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (this.config.useDatabaseByDefault) {
        // Production: Use FileSyncDatabase for live file watching
        this.database = new FileSyncDatabase(dbPath, {
          personasDir: this.config.personasDir,
          templatesDir: this.config.templatesDir,
          watchFiles: true,
          syncOnStartup: true
        });
        if (this.database instanceof FileSyncDatabase) {
          await this.database.initialize();
        }
        console.log('📊 Using FileSyncDatabase (production mode)');
      } else {
        // Development: Use FileSyncDatabase for hot reloading
        this.database = new FileSyncDatabase(dbPath, {
          personasDir: this.config.personasDir,
          templatesDir: this.config.templatesDir,
          watchFiles: true,
          syncOnStartup: true
        });
        if (this.database instanceof FileSyncDatabase) {
          await this.database.initialize();
        }
        console.log('🔥 Using FileSyncDatabase (development mode)');
      }

      // Wait for database to be ready
      let retries = 0;
      while (!this.database.isReady() && retries < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }      if (!this.database.isReady()) {
        throw new Error('Database failed to initialize within timeout');
      }

      // Initialize DocumentService if we have a DocumentDatabase
      if (this.database instanceof DocumentDatabase) {
        this.documentService = new DocumentService(this.database);
        console.log('📋 DocumentService initialized successfully');
      }

      console.log('✅ Database service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize database service:', error);
      this.initializationError = error as Error;
      
      if (this.config.fallbackToFiles) {
        console.log('🔄 Falling back to file-based services');
        this.database = null;
      } else {
        throw error;
      }
    }
  }

  public async initializeDatabaseWithSeedData(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeWithSeedData();
    return this.initializationPromise;
  }  private async _initializeWithSeedData(): Promise<void> {
    try {
      console.log('🗃️  Initializing database with seed data approach...');
      
      // Always use DocumentDatabase (no file watchers)
      const dbPath = this.config.dbPath || path.join(process.cwd(), 'data', 'voice-ai-documents.db');
      
      // Check SKIP_RESTORE environment variable
      const skipRestore = process.env.SKIP_RESTORE === 'true';
      console.log(`🔄 SKIP_RESTORE environment variable: ${skipRestore}`);
      let docDatabase = await DocumentDatabase.create(dbPath, skipRestore);
        // Check if database is empty (needs seeding) OR if SKIP_RESTORE is true (force fresh seeding)
        const stats = docDatabase.getDocumentStats();
        const isEmpty = stats.total === 0;
        const forceSeeding = skipRestore; // Force seeding when SKIP_RESTORE=true
        if (isEmpty || forceSeeding) {
          if (forceSeeding) {
            console.log('🔄 SKIP_RESTORE=true, forcing fresh seeding from files...');
          } else {
            console.log('📁 Database is empty, seeding from files...');
          }
          const { DatabaseMigration } = await import('../database/migration');
          const migration = await DatabaseMigration.create(dbPath);
          const result = await migration.migrateFromFiles();
          if (result.success) {
            console.log(`✅ Seeded database: ${result.personasCount} personas, ${result.templatesCount} templates, ${result.moodsCount} moods, ${result.scenariosCount} scenarios`);
            // Close migration DB to flush writes
            migration.close();
            console.log('🔄 Reloading a fresh database instance to pick up migration changes...');
            // Do NOT close the existing factory DB (which would overwrite the file)
            const reloadedDb = await DocumentDatabase.create(dbPath, false);
            docDatabase = reloadedDb;

            console.log('🔍 Verifying seeded data after reload:');
            const reloadedStats = docDatabase.getDocumentStats();
            console.log(`📊 Reloaded stats: ${reloadedStats.total} documents (${reloadedStats.personas} personas, ${reloadedStats.templates} templates, ${reloadedStats.moods} moods, ${reloadedStats.scenarios} scenarios)`);
            if (reloadedStats.total === 0) {
              console.warn('⚠️  Warning: No documents found after reload.');
            } else {
              console.log('✅ Seeded data accessible after reload');
            }
          } else {
            console.warn(`⚠️  Seeding completed with ${result.errors.length} errors`);
            migration.close();
          }
        } else {
          console.log(`🗃️  Database already populated (${stats.total} documents), skipping seed`);
        }
  
        // Set the database instance after seeding or skip
        this.database = docDatabase;
         
         // Initialize DocumentService with the database
         this.documentService = new DocumentService(docDatabase);
         console.log('📋 DocumentService initialized successfully');
         
         console.log('✅ Database ready for CRUD operations');
         
    } catch (error) {
      this.initializationError = error as Error;
      console.error('❌ Database initialization failed:', error);
      
      // No fallback to files - pure database approach
      throw error;
    }
  }
  public getDatabase(): FileSyncDatabase | DocumentDatabase | null {
    return this.database;
  }

  public getDocumentService(): DocumentService | null {
    return this.documentService;
  }

  public isDatabaseReady(): boolean {
    return this.database?.isReady() ?? false;
  }

  public shouldUseDatabase(): boolean {
    return this.isDatabaseReady();
  }

  public getInitializationError(): Error | null {
    return this.initializationError;
  }
  public async close(): Promise<void> {
    if (this.database) {
      console.log('🛑 Closing database service...');
      this.database.close();
      this.database = null;
    }
    this.documentService = null;
    this.initializationPromise = null;
    this.initializationError = null;
  }

  // File-based fallback utilities
  public static resolvePersonasDir(): string {
    const distPath = path.join(__dirname, '..', 'personas');
    if (fs.existsSync(distPath)) return distPath;
    const srcPath = path.join(__dirname, '..', '..', 'src', 'personas');
    if (fs.existsSync(srcPath)) return srcPath;
    // Try relative to cwd (deployment scenario)
    const cwdPersonas = path.join(process.cwd(), 'personas');
    if (fs.existsSync(cwdPersonas)) return cwdPersonas;
    throw new Error('Personas directory not found');
  }

  public static resolvePromptsDir(): string {
    const distPath = path.join(__dirname, '..', 'prompts');
    if (fs.existsSync(distPath)) return distPath;
    const srcPath = path.join(__dirname, '..', '..', 'src', 'prompts');
    if (fs.existsSync(srcPath)) return srcPath;
    // Try relative to cwd (deployment scenario)
    const cwdPrompts = path.join(process.cwd(), 'prompts');
    if (fs.existsSync(cwdPrompts)) return cwdPrompts;
    throw new Error('Prompts directory not found');
  }

  public resolvePersonasDir(): string {
    return DatabaseServiceFactory.resolvePersonasDir();
  }

  public resolvePromptsDir(): string {
    return DatabaseServiceFactory.resolvePromptsDir();
  }
}

// Singleton instance
export const databaseServiceFactory = DatabaseServiceFactory.getInstance();
