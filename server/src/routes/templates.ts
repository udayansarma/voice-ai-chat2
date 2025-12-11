import { Router, Request, Response } from 'express';
import { getAllTemplates, getTemplateById, searchTemplates, getTemplatesByModel, getAllTemplateNames } from '../services/templateService';
import { DatabaseServiceFactory } from '../services/database-service-factory';
import type { Template } from '../types/api';

const router = Router();

// Get DocumentService instance
const databaseServiceFactory = DatabaseServiceFactory.getInstance();

// POST /api/templates - Create a new template
router.post('/', async (req: Request, res: Response) => {
  try {
    const documentService = databaseServiceFactory.getDocumentService();
    if (!documentService) {
      res.status(503).json({ 
        success: false, 
        error: 'DocumentService not available. Check server initialization.' 
      });
      return;
    }

    const templateData = req.body;
    
    // Validate required fields
    if (!templateData.name || templateData.name.trim().length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Template name is required' 
      });
      return;
    }

    if (!templateData.prompt || templateData.prompt.trim().length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Template prompt is required' 
      });
      return;
    }

    const template = await documentService.createTemplate(templateData);
    res.status(201).json({ success: true, template });
    
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create template', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// PUT /api/templates/:id - Update an existing template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const documentService = databaseServiceFactory.getDocumentService();
    if (!documentService) {
      res.status(503).json({ 
        success: false, 
        error: 'DocumentService not available. Check server initialization.' 
      });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    // Don't allow ID changes
    if (updates.id && updates.id !== id) {
      res.status(400).json({ 
        success: false, 
        error: 'Cannot change template ID' 
      });
      return;
    }

    const template = await documentService.updateTemplate(id, updates);
    res.json({ success: true, template });
    
  } catch (error) {
    console.error('Error updating template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to update template', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

// DELETE /api/templates/:id - Delete a template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const documentService = databaseServiceFactory.getDocumentService();
    if (!documentService) {
      res.status(503).json({ 
        success: false, 
        error: 'DocumentService not available. Check server initialization.' 
      });
      return;
    }

    const { id } = req.params;
    
    await documentService.deleteTemplate(id);
    res.json({ success: true, message: `Template '${id}' deleted successfully` });
    
  } catch (error) {
    console.error('Error deleting template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete template', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

// GET /api/templates - List all templates
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates: Template[] = await getAllTemplates();
    res.json({ success: true, templates, count: templates.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load available templates', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/templates/search - Search templates by query parameter (?q=term)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.q as string;
    if (!searchTerm) {
      res.status(400).json({ 
        success: false, 
        error: 'Search term is required. Use /search?q=term.' 
      });
      return;
    }    const templates = await searchTemplates(searchTerm);
    res.json({ 
      success: true, 
      templates, 
      count: templates.length,
      searchTerm,
      searchMethod: 'query'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search templates', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/templates/search/:term - Search templates by path parameter
router.get('/search/:term', async (req: Request, res: Response) => {
  try {
    const searchTerm = req.params.term;
    if (!searchTerm) {
      res.status(400).json({ 
        success: false, 
        error: 'Search term is required. Use /search/:term.' 
      });
      return;
    }    const templates = await searchTemplates(searchTerm);
    res.json({ 
      success: true, 
      templates, 
      count: templates.length,
      searchTerm,
      searchMethod: 'path'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search templates', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/templates/model/:modelType - Filter templates by model type (new database feature)
router.get('/model/:modelType', async (req: Request, res: Response) => {
  try {
    const modelType = req.params.modelType;    const templates = await getTemplatesByModel(modelType);
    res.json({ 
      success: true, 
      templates, 
      count: templates.length,
      modelType
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to filter templates by model type', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/templates/debug-names - List all template IDs and names in the database
router.get('/debug-names', async (_req: Request, res: Response) => {
  try {
    const names = await getAllTemplateNames();
    if (names) {
      res.json({ success: true, templates: names });
      return;
    }
    res.status(404).json({ success: false, error: 'Database not in use or debug method missing.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get template names', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/templates/:id - Get a single template by id (must come after specific routes)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Skip if this looks like a search or other special route that wasn't caught above
    const id = req.params.id;
    if (id === 'search' || id === 'model') {
      res.status(400).json({ 
        success: false, 
        error: `Invalid template ID: ${id}. Use /search?q=term for searching or /model/:type for filtering.` 
      });
      return;
    }
    
    const template = await getTemplateById(id);
    if (!template) {
      res.status(404).json({ success: false, error: 'Template not found' });
      return;
    }
    res.json({ success: true, template });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load template', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
