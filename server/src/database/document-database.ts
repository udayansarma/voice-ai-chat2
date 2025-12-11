import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export interface DocumentRecord {
  id: string;
  type: 'persona' | 'prompt_template' | 'scenario' | 'mood';
  name: string;
  document: string; // JSON string
  file_path: string;
  file_modified: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentStats {
  personas: number;
  templates: number;
  scenarios: number;
  moods: number;
  total: number;
}

export class DocumentDatabase {
  protected db: Database | null = null;
  protected isInitialized = false;
  protected isFreshDatabase = false;
  private dbPath: string;
  
  // Blob storage properties
  private blobServiceClient?: BlobServiceClient;
  private containerClient?: ContainerClient;
  private blobClient?: BlockBlobClient;
  private useBlobStorage: boolean = false;
  private backupInterval?: NodeJS.Timeout;
  private readonly BLOB_CONTAINER_NAME = 'database-backups';
  private readonly BLOB_NAME = 'voice-ai-documents-latest.db';
  private readonly BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  protected constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'voice-ai-documents.db');
    
    // Detect environment and blob storage availability
    try {
      this.detectBlobStorageEnvironment();
    } catch (error) {
      console.warn('[DB] Failed to detect blob storage environment, continuing without blob storage:', error);
      this.useBlobStorage = false;
    }
  }
  /**
   * Create a new DocumentDatabase instance.
   * @param dbPath optional path to database file
   * @param skipRestore when true, skip blob restore and initialize fresh DB
   */
  static async create(dbPath?: string, skipRestore = false): Promise<DocumentDatabase> {
    const instance = new DocumentDatabase(dbPath);
    if (skipRestore) {
      // Skip blob restore and create fresh database
      await instance.initializeDatabase();
    } else {
      // Try restore from blob, fallback to fresh init
      await instance.initializeWithRestore();
    }
    return instance;
  }  protected async initializeDatabase(): Promise<void> {
    try {
      console.log(`[DB] Initializing database at path: ${this.dbPath}`);
      
      // Check if the directory exists and is writable
      const dbDir = path.dirname(this.dbPath);
      console.log(`[DB] Database directory: ${dbDir}`);
      
      if (!fs.existsSync(dbDir)) {
        console.log(`[DB] Creating database directory: ${dbDir}`);
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      // Test directory write permissions
      try {
        const testFile = path.join(dbDir, 'test-write.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(`[DB] Directory write test successful`);
      } catch (error) {
        console.error(`[DB] Directory write test failed:`, error);
        throw new Error(`Database directory not writable: ${dbDir}`);
      }
      
      console.log(`[DB] Initializing SQL.js...`);
      const SQL = await initSqlJs();
      console.log(`[DB] SQL.js initialized successfully`);
        // Check if database file exists
      if (fs.existsSync(this.dbPath)) {
        // Load existing database
        console.log(`[DB] Loading existing database file...`);
        const filebuffer = fs.readFileSync(this.dbPath);
        console.log(`[DB] Existing database file size: ${filebuffer.length} bytes`);
        this.db = new SQL.Database(filebuffer);
        this.isFreshDatabase = false;
        console.log(`[DB] ✅ Loaded existing database from ${this.dbPath}`);
        
        // Debug: Check record count in loaded database
        try {
          const result = this.db.exec('SELECT COUNT(*) as total FROM documents');
          const totalRecords = result[0]?.values[0]?.[0] || 0;
          console.log(`[DB] Loaded database contains ${totalRecords} total records`);
          
          // Also check the schema - make sure documents table exists
          const tableCheck = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'");
          if (tableCheck.length > 0) {
            console.log(`[DB] ✅ Documents table exists in loaded database`);
            
            // Let's also check what types of records we have
            const typeCheck = this.db.exec('SELECT type, COUNT(*) as count FROM documents GROUP BY type');
            if (typeCheck.length > 0 && typeCheck[0].values) {
              console.log(`[DB] Records by type:`, typeCheck[0].values);
            }
          } else {
            console.warn(`[DB] ⚠️  Documents table NOT found in loaded database!`);
          }
          
        } catch (error) {
          console.warn(`[DB] Could not count records in loaded database:`, error);
        }
      } else {
        // Create new database
        console.log(`[DB] Creating new database...`);
        this.db = new SQL.Database();
        this.isFreshDatabase = true;
        console.log(`[DB] ✅ Created new database at ${this.dbPath}`);
      }

      console.log(`[DB] Initializing database schema...`);
      this.initializeSchema();
      console.log(`[DB] ✅ Database schema initialized`);
      this.isInitialized = true;
      console.log(`[DB] ✅ Database initialization complete`);
    } catch (error) {
      console.error('[DB] ❌ Failed to initialize database:', error);
      // Add more detailed error information
      if (error instanceof Error) {
        console.error('[DB] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }
  private initializeSchema(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Create documents table with JSON storage
      console.log('[DB] Creating documents table...');
      this.db.run(`
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('persona', 'prompt_template', 'scenario', 'mood')),
          name TEXT NOT NULL,
          document TEXT NOT NULL,
          file_path TEXT NOT NULL,
          file_modified TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create indexes for performance
      console.log('[DB] Creating database indexes...');
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_documents_file_path ON documents(file_path)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_documents_type_name ON documents(type, name)`);
      
      // Ensure moods table exists (used by FileSyncDatabase and CRUD routes)
      console.log('[DB] Ensuring moods table exists...');
      this.db.run(`
        CREATE TABLE IF NOT EXISTS moods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mood TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_moods_mood ON moods(mood)`);
      
      console.log('[DB] Database schema initialized successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize database schema:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Please wait for initialization to complete.');
    }
  }  private saveDatabase(): void {
    if (!this.db) return;
    
    try {
      console.log(`[DEBUG] Saving database to: ${this.dbPath}`);
      
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        console.log(`[DEBUG] Creating data directory: ${dataDir}`);
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Save database to file
      const data = this.db.export();
      console.log(`[DEBUG] Database export size: ${data.length} bytes`);
      fs.writeFileSync(this.dbPath, data);
      
      // Verify the file was written
      if (fs.existsSync(this.dbPath)) {
        const stats = fs.statSync(this.dbPath);
        console.log(`[DEBUG] ✅ Database saved successfully - File size: ${stats.size} bytes, modified: ${stats.mtime}`);
      } else {
        console.error(`[DEBUG] ❌ Database file not found after save attempt`);
      }
      
      // Also save to blob storage if available (async, don't wait)
      if (this.useBlobStorage) {
        this.saveToBlob().catch(error => {
          console.error('[DEBUG] Background blob save failed:', error);
        });
      }
    } catch (error) {
      console.error('[DEBUG] Failed to save database:', error);
    }
  }
  // Document CRUD operations
  getAllPersonas(): any[] {
    this.ensureInitialized();
    
    // Debug: Check if database file exists
    console.log(`[DEBUG] getAllPersonas called - Database file exists: ${fs.existsSync(this.dbPath)}`);
    if (fs.existsSync(this.dbPath)) {
      const stats = fs.statSync(this.dbPath);
      console.log(`[DEBUG] Database file size: ${stats.size} bytes, modified: ${stats.mtime}`);
    }
    
    // Debug: Get total count first
    const countStmt = this.db!.prepare(`SELECT COUNT(*) as count FROM documents WHERE type = 'persona'`);
    if (countStmt.step()) {
      const countRow = countStmt.getAsObject();
      console.log(`[DEBUG] Total personas in database: ${countRow.count}`);
    }
    countStmt.free();
    
    const stmt = this.db!.prepare(`
      SELECT id, name, document 
      FROM documents 
      WHERE type = 'persona' 
      ORDER BY name
    `);
    
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id,
        name: row.name,
        ...JSON.parse(row.document as string)
      });
    }
    stmt.free();
    
    console.log(`[DEBUG] getAllPersonas returning ${results.length} personas`);
    return results;
  }

  getPersonaById(id: string): any | null {
    this.ensureInitialized();
    
    const stmt = this.db!.prepare(`
      SELECT document 
      FROM documents 
      WHERE type = 'persona' AND id = ?
    `);
    
    stmt.bind([id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      const result = JSON.parse(row.document as string);
      stmt.free();
      return result;
    }
    
    stmt.free();
    return null;
  }
  getAllTemplates(): any[] {
    this.ensureInitialized();
    
    // Debug: Check if database file exists  
    console.log(`[DEBUG] getAllTemplates called - Database file exists: ${fs.existsSync(this.dbPath)}`);
    if (fs.existsSync(this.dbPath)) {
      const stats = fs.statSync(this.dbPath);
      console.log(`[DEBUG] Database file size: ${stats.size} bytes, modified: ${stats.mtime}`);
    }
    
    // Debug: Get total count first
    const countStmt = this.db!.prepare(`SELECT COUNT(*) as count FROM documents WHERE type = 'prompt_template'`);
    if (countStmt.step()) {
      const countRow = countStmt.getAsObject();
      console.log(`[DEBUG] Total templates in database: ${countRow.count}`);
    }
    countStmt.free();
    
    const stmt = this.db!.prepare(`
      SELECT id, name, document 
      FROM documents 
      WHERE type = 'prompt_template' 
      ORDER BY name
    `);
    
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id,
        name: row.name,
        ...JSON.parse(row.document as string)
      });
    }
    stmt.free();
    
    console.log(`[DEBUG] getAllTemplates returning ${results.length} templates`);
    return results;
  }

  getTemplateById(id: string): any | null {
    this.ensureInitialized();
    
    const stmt = this.db!.prepare(`
      SELECT document 
      FROM documents 
      WHERE type = 'prompt_template' AND id = ?
    `);
    
    stmt.bind([id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      const result = JSON.parse(row.document as string);
      stmt.free();
      return result;
    }
    
    stmt.free();
    return null;
  }

  getAllScenarios(): any[] {
    this.ensureInitialized();
    const stmt = this.db!.prepare(`
      SELECT id, name, document 
      FROM documents 
      WHERE type = 'scenario' 
      ORDER BY name
    `);
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id,
        name: row.name,
        ...JSON.parse(row.document as string)
      });
    }
    stmt.free();
    return results;
  }  getScenarioById(id: string): any | null {
    this.ensureInitialized();
    const stmt = this.db!.prepare(`
      SELECT id, name, document 
      FROM documents 
      WHERE type = 'scenario' AND id = ?
    `);
    stmt.bind([id]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      const result = {
        id: row.id,
        name: row.name,
        ...JSON.parse(row.document as string)
      };
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }
  // Generic document operations
  upsertDocument(
    id: string, 
    type: 'persona' | 'prompt_template' | 'scenario' | 'mood', 
    name: string, 
    document: any,
    filePath: string,
    fileModified: Date
  ): void {
    this.ensureInitialized();
    
    // Validate JSON before storing
    const jsonString = JSON.stringify(document);
    
    const stmt = this.db!.prepare(`
      INSERT OR REPLACE INTO documents 
      (id, type, name, document, file_path, file_modified, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    stmt.run([
      id, 
      type, 
      name, 
      jsonString, 
      filePath, 
      fileModified.toISOString()
    ]);
    stmt.free();
    
    // Save database to file
    this.saveDatabase();
  }

  deleteDocument(id: string, type: 'persona' | 'prompt_template' | 'scenario'): boolean {
    this.ensureInitialized();
    
    const stmt = this.db!.prepare(`
      DELETE FROM documents 
      WHERE id = ? AND type = ?
    `);
    
    stmt.run([id, type]);
    const changes = this.db!.getRowsModified();
    stmt.free();
    
    if (changes > 0) {
      this.saveDatabase();
      return true;
    }
    
    return false;
  }

  // Advanced search functionality
  searchDocuments(type: 'persona' | 'prompt_template' | 'scenario', searchTerm: string): any[] {
    this.ensureInitialized();
    const sql = `
      SELECT id, name, document 
      FROM documents 
      WHERE type = ? 
        AND (
          LOWER(name) LIKE LOWER(?) 
          OR LOWER(document) LIKE LOWER(?)
        )
      ORDER BY name
    `;
    const searchPattern = `%${searchTerm}%`;
    console.log('DEBUG: Running searchDocuments SQL:', sql.replace(/\n/g, ' '));
    console.log('DEBUG: Bind params:', [type, searchPattern, searchPattern]);
    const stmt = this.db!.prepare(sql);
    stmt.bind([type, searchPattern, searchPattern]);
    const results: any[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id,
        name: row.name,
        ...JSON.parse(row.document as string)
      });
    }
    stmt.free();
    console.log('DEBUG: searchDocuments found', results.length, 'results');
    return results;
  }
  // Get document statistics
  getDocumentStats(): DocumentStats {
    this.ensureInitialized();
    
    console.log(`[DEBUG] getDocumentStats called - DB initialized: ${this.isInitialized}, DB exists: ${!!this.db}`);
    
    // First, let's try a simple COUNT(*) to see if the table exists and has data
    try {
      const totalStmt = this.db!.prepare(`SELECT COUNT(*) as total FROM documents`);
      if (totalStmt.step()) {
        const totalRow = totalStmt.getAsObject();
        console.log(`[DEBUG] Total documents in table: ${totalRow.total}`);
      }
      totalStmt.free();
    } catch (error) {
      console.error(`[DEBUG] Error getting total count:`, error);
    }
    
    // Now get the breakdown by type
    const stmt = this.db!.prepare(`
      SELECT 
        type,
        COUNT(*) as count
      FROM documents 
      GROUP BY type
    `);
      const stats: DocumentStats = { personas: 0, templates: 0, scenarios: 0, moods: 0, total: 0 };
    
    console.log(`[DEBUG] Starting to iterate through type counts...`);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`[DEBUG] Found type: ${row.type}, count: ${row.count}`);
      if (row.type === 'persona') stats.personas = row.count as number;
      if (row.type === 'prompt_template') stats.templates = row.count as number;
      if (row.type === 'scenario') stats.scenarios = row.count as number;
      if (row.type === 'mood') stats.moods = row.count as number;
      stats.total += row.count as number;
    }
    stmt.free();
    
    console.log(`[DEBUG] Final stats:`, stats);
    return stats;
  }

  // Get all documents (for debugging/admin purposes)
  getAllDocuments(): DocumentRecord[] {
    this.ensureInitialized();
    
    const stmt = this.db!.prepare('SELECT * FROM documents ORDER BY type, name');
    
    const results: DocumentRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        type: row.type as 'persona' | 'prompt_template' | 'scenario',
        name: row.name as string,
        document: row.document as string,
        file_path: row.file_path as string,
        file_modified: row.file_modified as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string
      });
    }
    stmt.free();
    
    return results;
  }

  // Public: Get all template IDs and names
  getAllTemplateNames(): { id: string; name: string }[] {
    this.ensureInitialized();
    const stmt = this.db!.prepare(`SELECT id, name FROM documents WHERE type = 'prompt_template'`);
    const names: { id: string; name: string }[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      names.push({ id: String(row.id), name: String(row.name) });
    }
    stmt.free();
    return names;
  }
  // === MOOD OPERATIONS ===

  getAllMoods(): { mood: string; description: string }[] {
    this.ensureInitialized();
    const stmt = this.db!.prepare('SELECT document FROM documents WHERE type = ?');
    const moods: { mood: string; description: string }[] = [];
    
    stmt.bind(['mood']);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      try {
        const moodData = JSON.parse(row.document as string);
        moods.push({
          mood: moodData.mood,
          description: moodData.description
        });
      } catch (error) {
        console.error('Error parsing mood document:', error);
      }
    }
    stmt.free();
    
    return moods;
  }

  getMoodById(id: string): { id: string; mood: string; description: string } | null {
    this.ensureInitialized();
    const stmt = this.db!.prepare('SELECT document FROM documents WHERE type = ? AND id = ?');
    stmt.bind(['mood', id]);
    
    if (stmt.step()) {
      const row = stmt.getAsObject();
      try {
        const moodData = JSON.parse(row.document as string);
        stmt.free();
        return {
          id: id,
          mood: moodData.mood,
          description: moodData.description        };
      } catch (error) {
        console.error('Error parsing mood document:', error);
      }
    }
    stmt.free();
    return null;
  }
  createMood(moodData: { id: string; mood: string; description?: string }): void {
    this.ensureInitialized();
    try {
      const document = {
        mood: moodData.mood,
        description: moodData.description || ''
      };
      
      this.upsertDocument(
        moodData.id,
        'mood',
        moodData.mood,
        document,
        '', // No file path for created moods
        new Date()
      );
    } catch (error) {
      console.error('[createMood] Error:', error);
      throw error;
    }
  }
  updateMood(id: string, moodData: { mood: string; description?: string }): void {
    this.ensureInitialized();
    try {
      // First check if the mood exists
      const existing = this.getMoodById(id);
      
      if (!existing) {
        throw new Error(`Mood with id '${id}' not found`);
      }
      
      // Update the mood using upsertDocument
      const document = {
        mood: moodData.mood,
        description: moodData.description || ''
      };
      
      this.upsertDocument(
        id,
        'mood',
        moodData.mood,
        document,
        '', // No file path for updated moods
        new Date()
      );
    } catch (error) {
      console.error('[updateMood] Error:', error);
      throw error;
    }
  }
  deleteMood(id: string): void {
    this.ensureInitialized();
    try {
      // First check if the mood exists
      const existing = this.getMoodById(id);
      
      if (!existing) {
        throw new Error(`Mood with id '${id}' not found`);
      }
      
      // Delete the mood from documents table
      const stmt = this.db!.prepare('DELETE FROM documents WHERE type = ? AND id = ?');
      stmt.run(['mood', id]);
      stmt.free();
      
      this.saveDatabase();
    } catch (error) {
      console.error('[deleteMood] Error:', error);
      throw error;
    }
  }

  // Check if this is a fresh database (newly created)
  isFreshInit(): boolean {
    return this.isFreshDatabase;
  }

  // Check if database is ready
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }
  close(): void {
    if (this.db) {
      // Clear backup interval
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
        this.backupInterval = undefined;
      }
      
      // Save final backup
      this.saveDatabase();
      
      // Close database
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('Database closed');
    }
  }

  private detectBlobStorageEnvironment(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const hasAzureStorage = !!(process.env.AZURE_STORAGE_ACCOUNT_NAME);
    const isAzureContainer = !!(process.env.CONTAINER_APP_NAME);
    
    this.useBlobStorage = isProduction && hasAzureStorage && isAzureContainer;
    
    console.log(`[DB] Environment detection:`);
    console.log(`[DB] - NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`[DB] - AZURE_STORAGE_ACCOUNT_NAME: ${hasAzureStorage ? 'Set' : 'Not set'}`);
    console.log(`[DB] - CONTAINER_APP_NAME: ${isAzureContainer ? 'Set' : 'Not set'}`);
    console.log(`[DB] - Use blob storage: ${this.useBlobStorage}`);
    
    if (this.useBlobStorage) {
      this.initializeBlobClient();
    }
  }
    private initializeBlobClient(): void {
    try {
      const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      if (!storageAccountName) {
        console.log('[DB] AZURE_STORAGE_ACCOUNT_NAME not set, disabling blob storage');
        this.useBlobStorage = false;
        return;
      }
      
      // Use managed identity for authentication in Azure Container Apps
      const credential = new DefaultAzureCredential();
      const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`;
      
      this.blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
      this.containerClient = this.blobServiceClient.getContainerClient(this.BLOB_CONTAINER_NAME);
      this.blobClient = this.containerClient.getBlockBlobClient(this.BLOB_NAME);
      
      console.log(`[DB] Blob storage client initialized for account: ${storageAccountName}`);
    } catch (error) {
      console.warn('[DB] Failed to initialize blob storage client, continuing without blob storage:', error);
      this.useBlobStorage = false;
      // Clear any partially initialized clients
      this.blobServiceClient = undefined;
      this.containerClient = undefined;
      this.blobClient = undefined;
    }
  }
  protected async initializeWithRestore(): Promise<void> {
    try {
      console.log(`[DB] Starting database initialization with restore capability`);
      
      // Step 1: Ensure blob container exists if using blob storage
      if (this.useBlobStorage) {
        try {
          await this.ensureBlobContainerExists();
        } catch (error) {
          console.warn('[DB] Failed to ensure blob container exists, disabling blob storage:', error);
          this.useBlobStorage = false;
        }
      }
      
      // Step 2: Try to restore from blob storage first
      let restoredFromBlob = false;
      if (this.useBlobStorage) {
        try {
          restoredFromBlob = await this.restoreFromBlob();
        } catch (error) {
          console.warn('[DB] Failed to restore from blob storage, continuing with normal initialization:', error);
          this.useBlobStorage = false;
        }
      }
      
      // Step 3: If not restored from blob, initialize normally
      if (!restoredFromBlob) {
        await this.initializeDatabase();
      } else {
        // Still need to initialize schema and mark as initialized
        const SQL = await initSqlJs();
        this.initializeSchema();
        this.isInitialized = true;
        console.log(`[DB] ✅ Database restored from blob storage and ready`);
      }
      
      // Step 4: Start periodic backup if using blob storage
      if (this.useBlobStorage && this.isInitialized) {
        try {
          this.startPeriodicBackup();
        } catch (error) {
          console.warn('[DB] Failed to start periodic backup, continuing without it:', error);
        }
      }
      
      // Step 5: Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('[DB] ❌ Failed to initialize database with restore:', error);
      throw error;
    }
  }
  
  private async ensureBlobContainerExists(): Promise<void> {
    try {
      if (!this.containerClient) {
        throw new Error('Container client not initialized');
      }
      
      console.log(`[DB] Ensuring blob container '${this.BLOB_CONTAINER_NAME}' exists`);
      await this.containerClient.createIfNotExists();
      console.log(`[DB] ✅ Blob container ready`);
    } catch (error) {
      console.error('[DB] Failed to create blob container:', error);
      throw error;
    }
  }
  
  private async restoreFromBlob(): Promise<boolean> {
    try {
      if (!this.blobClient) {
        console.log('[DB] Blob client not available, skipping restore');
        return false;
      }
      
      console.log(`[DB] Attempting to restore database from blob storage...`);
      
      // Check if blob exists
      const exists = await this.blobClient.exists();
      if (!exists) {
        console.log('[DB] No database backup found in blob storage, will start fresh');
        return false;
      }
      
      // Download and restore
      const downloadResponse = await this.blobClient.downloadToBuffer();
      console.log(`[DB] Downloaded database backup: ${downloadResponse.length} bytes`);
      
      const SQL = await initSqlJs();
      this.db = new SQL.Database(downloadResponse);
      this.isFreshDatabase = false;
      
      console.log(`[DB] ✅ Successfully restored database from blob storage`);
      return true;
      
    } catch (error) {
      console.error('[DB] Failed to restore from blob storage:', error);
      console.log('[DB] Will fall back to normal initialization');
      return false;
    }
  }
  
  private async saveToBlob(): Promise<void> {
    try {
      if (!this.useBlobStorage || !this.blobClient || !this.db) {
        return;
      }
      
      console.log(`[DB] Saving database to blob storage...`);
      const startTime = Date.now();
      
      // Export database to buffer
      const dbBuffer = this.db.export();
      console.log(`[DB] Database export size: ${dbBuffer.length} bytes`);
        // Upload to blob storage
      await this.blobClient.uploadData(dbBuffer, { 
        metadata: {
          timestamp: new Date().toISOString(),
          size: dbBuffer.length.toString()
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`[DB] ✅ Database saved to blob storage in ${duration}ms`);
      
    } catch (error) {
      console.error('[DB] Failed to save database to blob storage:', error);
      // Don't throw - backup failures shouldn't crash the app
    }
  }
  
  private startPeriodicBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    console.log(`[DB] Starting periodic backup every ${this.BACKUP_INTERVAL_MS / 1000 / 60} minutes`);
    
    this.backupInterval = setInterval(async () => {
      try {
        await this.saveToBlob();
      } catch (error) {
        console.error('[DB] Periodic backup failed:', error);
      }
    }, this.BACKUP_INTERVAL_MS);
  }
  
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async () => {
      console.log('[DB] Graceful shutdown initiated, saving final backup...');
      try {
        if (this.backupInterval) {
          clearInterval(this.backupInterval);
        }
        await this.saveToBlob();
        console.log('[DB] Final backup completed');
      } catch (error) {
        console.error('[DB] Failed to save final backup:', error);
      }
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('beforeExit', gracefulShutdown);
  }
}
