import { Router, Request, Response } from 'express';
import { DatabaseServiceFactory } from '../services/database-service-factory';
import type { Mood } from '../types/api';

console.log('Moods router loaded');

const router = Router();

// Get DocumentService instance
const databaseServiceFactory = DatabaseServiceFactory.getInstance();

// TEST route
router.get('/test', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Moods router test route hit' });
});

// GET /api/moods - List all moods
router.get('/', async (_req: Request, res: Response) => {
  try {
    const documentService = databaseServiceFactory.getDocumentService();
    if (!documentService) {
      res.status(503).json({ 
        success: false, 
        error: 'DocumentService not available. Check server initialization.' 
      });
      return;
    }

    const moods = await documentService.listMoods();
    res.json({ success: true, moods });
    
  } catch (error) {
    console.error('Error listing moods:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to list moods', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// GET /api/moods/:id - Get a specific mood
router.get('/:id', async (req: Request, res: Response) => {
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
    const mood = await documentService.getMood(id);
    
    if (!mood) {
      res.status(404).json({ 
        success: false, 
        error: `Mood with id '${id}' not found` 
      });
      return;
    }
    
    res.json({ success: true, mood });
    
  } catch (error) {
    console.error('Error getting mood:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get mood', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// POST /api/moods - Create a new mood
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

    const moodData = req.body;
    
    // Validate required fields
    if (!moodData.mood || moodData.mood.trim().length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Mood name is required' 
      });
      return;
    }

    const mood = await documentService.createMood(moodData);
    res.status(201).json({ success: true, mood });
    
  } catch (error) {
    console.error('Error creating mood:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create mood', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// PUT /api/moods/:id - Update an existing mood
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
        error: 'Cannot change mood ID' 
      });
      return;
    }

    const mood = await documentService.updateMood(id, updates);
    res.json({ success: true, mood });
    
  } catch (error) {
    console.error('Error updating mood:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to update mood', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

// DELETE /api/moods/:id - Delete a mood
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
    
    await documentService.deleteMood(id);
    res.json({ success: true, message: `Mood '${id}' deleted successfully` });
    
  } catch (error) {
    console.error('Error deleting mood:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete mood', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

export default router;
