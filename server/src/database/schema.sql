-- SQLite schema for Voice AI Chat document storage
-- This file is for documentation purposes - the actual schema is created by DocumentDatabase class

-- Main documents table with JSON storage
CREATE TABLE documents (
  id TEXT PRIMARY KEY,                              -- Unique identifier (filename without extension)
  type TEXT NOT NULL CHECK (type IN ('persona', 'prompt_template', 'scenario')), -- Document type
  name TEXT NOT NULL,                               -- Display name from document content
  document TEXT NOT NULL,                           -- Full JSON document content
  file_path TEXT NOT NULL,                          -- Source file path
  file_modified TEXT NOT NULL,                      -- Source file modification timestamp
  created_at TEXT DEFAULT (datetime('now')),       -- Record creation timestamp
  updated_at TEXT DEFAULT (datetime('now'))        -- Record update timestamp
);

-- Performance indexes
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_name ON documents(name);
CREATE INDEX idx_documents_file_path ON documents(file_path);
CREATE INDEX idx_documents_type_name ON documents(type, name);

-- Example queries for JSON data extraction (SQLite JSON functions)
-- Note: sql.js may have limited JSON function support

-- Get personas by age group (if demographics.ageGroup exists in JSON)
-- SELECT id, name, json_extract(document, '$.demographics.ageGroup') as age_group
-- FROM documents 
-- WHERE type = 'persona' 
--   AND json_extract(document, '$.demographics.ageGroup') IS NOT NULL;

-- Get templates by model type (if model.api exists in JSON)
-- SELECT id, name, json_extract(document, '$.model.api') as model_api
-- FROM documents 
-- WHERE type = 'prompt_template'
--   AND json_extract(document, '$.model.api') IS NOT NULL;

-- Full-text search across document content
-- SELECT id, name, snippet(documents_fts) as snippet
-- FROM documents_fts
-- WHERE documents_fts MATCH 'search_term'
-- ORDER BY rank;

-- Moods table for storing mood and description
CREATE TABLE IF NOT EXISTS moods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_moods_mood ON moods(mood);
