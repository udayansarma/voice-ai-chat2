import { DocumentDatabase } from './document-database';
import { SyncUtils } from './sync-utils';
import chokidar, { FSWatcher } from 'chokidar';
import fs from 'fs/promises';
import path from 'path';

export interface FileSyncOptions {
  personasDir?: string;
  templatesDir?: string;
  watchFiles?: boolean;
  syncOnStartup?: boolean;
}

export class FileSyncDatabase extends DocumentDatabase {
  private personasDir: string;
  private templatesDir: string;
  private scenariosDir: string;
  private moodsFile: string;
  private watchFiles: boolean;
  private syncOnStartup: boolean;
  private watchers: FSWatcher[] = [];
  private scenarioIdMap: Map<string, string> = new Map();

  constructor(dbPath: string, options?: FileSyncOptions) {
    super(dbPath);
    // Resolve paths relative to server/src directory
    const baseDir = path.resolve(__dirname, '..');
    this.personasDir = options?.personasDir || path.join(baseDir, 'personas');
    this.templatesDir = options?.templatesDir || path.join(baseDir, 'prompts');
    this.scenariosDir = path.join(baseDir, 'scenarios');
    this.moodsFile = path.join(baseDir, 'util', 'moods.json');
    this.watchFiles = options?.watchFiles ?? true;
    this.syncOnStartup = options?.syncOnStartup ?? true;
  }  async initialize(): Promise<void> {
    try {
      console.log('[FileSyncDB] Starting FileSyncDatabase initialization...');
      
      // First, ensure the base DocumentDatabase is initialized
      if (!this.isInitialized) {
        console.log('[FileSyncDB] Initializing base DocumentDatabase...');
        await this.initializeWithRestore();
        console.log('[FileSyncDB] Base DocumentDatabase initialized successfully');
      }
      
      if (this.syncOnStartup) {
        console.log('🔄 Starting initial file sync...');
        await this.syncAllFiles();
        console.log('✅ Initial file sync completed');
      }
      
      if (this.watchFiles) {
        console.log('👀  Starting file watchers...');
        await this.startFileWatchers();
        console.log('✅ File watchers started');
      }
      
      console.log('[FileSyncDB] ✅ FileSyncDatabase initialization complete');
    } catch (error) {
      console.error('[FileSyncDB] ❌ Failed to initialize FileSyncDatabase:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    for (const watcher of this.watchers) {
      await watcher.close();
    }
    this.watchers = [];
    await super.close();
  }
  private async syncAllFiles(): Promise<void> {
    try {
      await this.syncPersonas();
      await this.syncTemplates();
      await this.syncScenarios();
      
      // Only sync moods from file on fresh database initialization
      // After that, moods are managed via CRUD operations
      if (this.isFreshInit()) {
        console.log('🆕 Fresh database detected - loading initial moods from file');
        await this.syncMoods();
      } else {
        console.log('📊 Existing database - skipping mood file sync (using database moods)');
      }

      // Fallback: if moods table exists but is empty (e.g., after schema upgrade), seed from file once
      if (this.db) {
        try {
          const result = this.db.exec('SELECT COUNT(*) as count FROM moods');
          const count = result?.[0]?.values?.[0]?.[0] ?? 0;
          if (count === 0) {
            console.log('🪄 Moods table is empty. Seeding moods from file as a one-time fallback...');
            await this.syncMoods();
          }
        } catch (e) {
          console.warn('[syncAllFiles] Unable to check/seed moods table:', e);
        }
      }
    } catch (error) {
      console.error('❌ Error during file sync:', error);
      throw error;
    }
  }

  private async syncPersonas(): Promise<void> {
    try {
      const files = await fs.readdir(this.personasDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const fileIds = new Set(jsonFiles.map(f => path.basename(f, '.json')));
      console.log(`📂 Found ${jsonFiles.length} persona files to sync`);
      for (const file of jsonFiles) {
        await this.syncPersonaFile(path.join(this.personasDir, file));
      }
      // Remove personas from DB that no longer exist on disk
      const dbPersonas = this.getAllPersonas();
      for (const persona of dbPersonas) {
        if (!fileIds.has(persona.id)) {
          this.deleteDocument(persona.id, 'persona');
          console.log(`🗑️  Removed stale persona from DB: ${persona.id}`);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing personas:', error);
      throw error;
    }
  }

  private async syncTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templatesDir);
      const promptyFiles = files.filter(f => f.endsWith('.prompty'));
      const fileIds = new Set(promptyFiles.map(f => path.basename(f, '.prompty')));
      console.log(`📂 Found ${promptyFiles.length} template files to sync`);
      for (const file of promptyFiles) {
        await this.syncTemplateFile(path.join(this.templatesDir, file));
      }
      // Remove templates from DB that no longer exist on disk
      const dbTemplates = this.getAllTemplates();
      for (const template of dbTemplates) {
        if (!fileIds.has(template.id)) {
          this.deleteDocument(template.id, 'prompt_template');
          console.log(`🗑️  Removed stale template from DB: ${template.id}`);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing templates:', error);
      throw error;
    }
  }

  private async syncScenarios(): Promise<void> {
    try {
      // Wipe all existing scenarios to ensure a clean sync
      if (this.db) {
        this.db.run("DELETE FROM documents WHERE type = 'scenario'");
        console.log('🗑️  Cleared existing scenarios from DB');
      }
      const files = await fs.readdir(this.scenariosDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      console.log(`📂 Found ${jsonFiles.length} scenario files to sync`);
      for (const file of jsonFiles) {
        const filePath = path.join(this.scenariosDir, file);
        await this.syncScenarioFile(filePath);
      }
    } catch (error) {
      console.error('❌ Error syncing scenarios:', error);
      throw error;
    }
  }
  private async syncMoods(): Promise<void> {
    try {
      const content = await fs.readFile(this.moodsFile, 'utf-8');
      const moods = JSON.parse(content);
      // Remove all existing moods (this will delete any CRUD-created moods!)
      if (this.db) this.db.run('DELETE FROM moods');
      // Insert all moods from file
      if (this.db) {
        const stmt = this.db.prepare('INSERT INTO moods (mood, description) VALUES (?, ?)');
        for (const entry of moods) {
          stmt.run([entry.mood, entry.description]);
        }
        stmt.free();
        // Log row count after insert
        const countResult = this.db.exec('SELECT COUNT(*) as count FROM moods');
        const count = countResult[0]?.values[0]?.[0] ?? 0;
        console.log(`[syncMoods] Inserted moods from file, row count now: ${count}`);
      }
      console.log(`🔄 Synced moods from moods.json (${moods.length} moods)`);
    } catch (error) {
      console.error('❌ Error syncing moods:', error);
      throw error;
    }
  }

  private async syncPersonaFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const persona = JSON.parse(content);
      if (!SyncUtils.validatePersonaStructure(persona)) {
        console.warn(`⚠️  Invalid persona file: ${filePath}`);
        return;
      }
      const fileName = path.basename(filePath, '.json');
      const stats = await fs.stat(filePath);
      this.upsertDocument(
        fileName,
        'persona',
        persona.name || fileName,
        persona,
        filePath,
        stats.mtime
      );
      console.log(`🔄 Synced persona: ${fileName}`);
    } catch (error) {
      console.error(`❌ Error syncing persona file ${filePath}:`, error);
      throw error;
    }
  }

  private async syncTemplateFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsedFile = SyncUtils.parsePromptyFile(content);
      if (!parsedFile || !SyncUtils.validatePromptStructure(parsedFile)) {
        console.warn(`⚠️  Invalid template file: ${filePath}`);
        return;
      }
      const fileName = path.basename(filePath, '.prompty');
      const stats = await fs.stat(filePath);
      this.upsertDocument(
        fileName,
        'prompt_template',
        parsedFile.name || fileName,
        parsedFile,
        filePath,
        stats.mtime
      );
      console.log(`🔄 Synced template: ${fileName}`);
    } catch (error) {
      console.error(`❌ Error syncing template file ${filePath}:`, error);
      throw error;
    }
  }

  private async syncScenarioFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const scenario = JSON.parse(content);
      const id = typeof scenario.id === 'string' ? scenario.id : path.basename(filePath, '.json');
      const key = path.basename(filePath, '.json');
      this.scenarioIdMap.set(key, id);
      const stats = await fs.stat(filePath);
      this.upsertDocument(
        id,
        'scenario',
        scenario.title || id,
        scenario,
        filePath,
        stats.mtime
      );
      console.log(`🔄 Synced scenario: ${id}`);
    } catch (error) {
      console.error(`❌ Error syncing scenario file ${filePath}:`, error);
      throw error;
    }
  }

  private startFileWatchers(): void {
    // Watch personas directory
    const personaWatcher = chokidar.watch(
      path.join(this.personasDir, '*.json'),
      {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        },
        usePolling: false,
        alwaysStat: true,
        depth: 0
      }
    );
    personaWatcher
      .on('add', (filePath) => {
        console.log(`📁 New persona file detected: ${filePath}`);
        this.syncPersonaFile(filePath).catch(console.error);
      })
      .on('change', (filePath) => {
        console.log(`📝 Persona file changed: ${filePath}`);
        this.syncPersonaFile(filePath).catch(console.error);
      })
      .on('unlink', (filePath) => {
        console.log(`🗑️  Persona file deleted: ${filePath}`);
        const fileName = path.basename(filePath, '.json');
        this.deleteDocument(fileName, 'persona');
      })
      .on('error', (error) => {
        console.error('❌ Persona watcher error:', error);
      })
      .on('ready', () => {
        console.log('👁️  Persona file watcher ready');
      });
    this.watchers.push(personaWatcher);
    // Watch templates directory
    const templateWatcher = chokidar.watch(
      path.join(this.templatesDir, '*.prompty'),
      {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        },
        usePolling: false,
        alwaysStat: true,
        depth: 0
      }
    );
    templateWatcher
      .on('add', (filePath) => {
        console.log(`📁 New template file detected: ${filePath}`);
        this.syncTemplateFile(filePath).catch(console.error);
      })
      .on('change', (filePath) => {
        console.log(`📝 Template file changed: ${filePath}`);
        this.syncTemplateFile(filePath).catch(console.error);
      })
      .on('unlink', (filePath) => {
        console.log(`🗑️  Template file deleted: ${filePath}`);
        const fileName = path.basename(filePath, '.prompty');
        this.deleteDocument(fileName, 'prompt_template');
      })
      .on('error', (error) => {
        console.error('❌ Template watcher error:', error);
      })
      .on('ready', () => {
        console.log('👁️  Template file watcher ready');
      });
    this.watchers.push(templateWatcher);
    // Watch scenarios directory
    const scenarioWatcher = chokidar.watch(
      path.join(this.scenariosDir, '*.json'),
      {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        },
        usePolling: false,
        alwaysStat: true,
        depth: 0
      }
    );
    scenarioWatcher
      .on('add', (filePath) => {
        console.log(`📁 New scenario file detected: ${filePath}`);
        this.syncScenarioFile(filePath).catch(console.error);
      })
      .on('change', (filePath) => {
        console.log(`📝 Scenario file changed: ${filePath}`);
        this.syncScenarioFile(filePath).catch(console.error);
      })
      .on('unlink', (filePath) => {
        console.log(`🗑️  Scenario file deleted: ${filePath}`);
        const key = path.basename(filePath, '.json');
        const id = this.scenarioIdMap.get(key) ?? key;
        if (this.deleteDocument(id, 'scenario')) {
          console.log(`🗑️  Removed scenario from DB: ${id}`);
        }
      })
      .on('error', (error) => {
        console.error('❌ Scenario watcher error:', error);
      })
      .on('ready', () => {
        console.log('👁️  Scenario file watcher ready');
      });
    this.watchers.push(scenarioWatcher);
    // Watch moods file
    const moodsWatcher = chokidar.watch(
      this.moodsFile,
      {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        },
        usePolling: false,
        alwaysStat: true,
        depth: 0
      }
    );
    moodsWatcher
      .on('change', (filePath) => {
        console.log(`📝 Moods file changed: ${filePath}`);
        this.syncMoods().catch(console.error);
      })
      .on('error', (error) => {
        console.error('❌ Moods watcher error:', error);
      })
      .on('ready', () => {
        console.log('👁️  Moods file watcher ready');
      });
    this.watchers.push(moodsWatcher);
  }

  // Public method to get all moods from the database
  public getAllMoods(): { mood: string; description: string }[] {
    if (!this.db) {
      console.log('[getAllMoods] No db instance');
      return [];
    }
    const result = this.db.exec('SELECT mood, description FROM moods');
    console.log('[getAllMoods] Query result:', JSON.stringify(result, null, 2));
    if (!result[0]) {
      console.log('[getAllMoods] No result[0]');
      return [];
    }
    const moods = result[0].values.map(([mood, description]) => ({
      mood: mood ? String(mood) : '',
      description: description ? String(description) : ''
    }));
    console.log('[getAllMoods] Returning moods:', moods);
    return moods;
  }

  // === MOOD-SPECIFIC CRUD METHODS ===

  public getMoodById(id: string): { id: string; mood: string; description: string } | null {
    if (!this.db) {
      console.log('[getMoodById] No db instance');
      return null;
    }
    
    const result = this.db.exec('SELECT mood, description FROM moods WHERE mood = ?', [id]);
    console.log('[getMoodById] Query result:', JSON.stringify(result, null, 2));
    
    if (!result[0] || !result[0].values[0]) {
      console.log('[getMoodById] No result found for id:', id);
      return null;
    }
    
    const [mood, description] = result[0].values[0];
    return {
      id: String(mood),
      mood: String(mood),
      description: String(description)
    };
  }
  public createMood(moodData: { id: string; mood: string; description: string }): void {
    if (!this.db) {
      console.log('[createMood] No db instance');
      throw new Error('Database not initialized');
    }
    
    try {
      this.db.run('INSERT INTO moods (mood, description) VALUES (?, ?)', [moodData.mood, moodData.description]);
      console.log('[createMood] Created mood:', moodData.mood);
    } catch (error) {
      console.error('[createMood] Error:', error);
      throw error;
    }
  }public updateMood(id: string, moodData: { mood: string; description: string }): void {
    if (!this.db) {
      console.log('[updateMood] No db instance');
      throw new Error('Database not initialized');
    }
    
    try {
      // First check if the mood exists
      const existsResult = this.db.exec('SELECT COUNT(*) as count FROM moods WHERE mood = ?', [id]);
      const count = existsResult[0]?.values[0]?.[0];
      const exists = count && Number(count) > 0;
      
      if (!exists) {
        throw new Error(`Mood with id '${id}' not found`);
      }
      
      // Update the mood
      this.db.run('UPDATE moods SET mood = ?, description = ? WHERE mood = ?', [moodData.mood, moodData.description, id]);
      console.log('[updateMood] Updated mood:', id);
    } catch (error) {
      console.error('[updateMood] Error:', error);
      throw error;
    }
  }

  public deleteMood(id: string): void {
    if (!this.db) {
      console.log('[deleteMood] No db instance');
      throw new Error('Database not initialized');
    }
    
    try {
      // First check if the mood exists
      const existsResult = this.db.exec('SELECT COUNT(*) as count FROM moods WHERE mood = ?', [id]);
      const count = existsResult[0]?.values[0]?.[0];
      const exists = count && Number(count) > 0;
      
      if (!exists) {
        throw new Error(`Mood with id '${id}' not found`);
      }
      
      // Delete the mood
      this.db.run('DELETE FROM moods WHERE mood = ?', [id]);
      console.log('[deleteMood] Deleted mood:', id);
    } catch (error) {
      console.error('[deleteMood] Error:', error);
      throw error;
    }
  }

  // Manual sync methods for testing
  async forceSyncPersonas(): Promise<void> {
    console.log('🔄 Force syncing personas...');
    await this.syncPersonas();
  }

  async forceSyncTemplates(): Promise<void> {
    console.log('🔄 Force syncing templates...');
    await this.syncTemplates();
  }

  async forceSyncMoods(): Promise<void> {
    console.log('⚠️  WARNING: Force syncing moods will DELETE all CRUD-created moods!');
    console.log('🔄 Force syncing moods from file...');
    await this.syncMoods();
  }

  async forceSyncAll(): Promise<void> {
    console.log('🔄 Force syncing all files...');
    await this.syncAllFiles();
  }
}
