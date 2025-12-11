import { Router, Request, Response } from 'express';
import { getAllScenarios, getScenarioById } from '../services/scenarioService';
import { DatabaseServiceFactory } from '../services/database-service-factory';
import type { Scenario } from '../types/api';

console.log('Scenarios router loaded');

const router = Router();

// Get DocumentService instance
const databaseServiceFactory = DatabaseServiceFactory.getInstance();

// GET /api/scenarios - List all scenarios
router.get('/', async (_req: Request, res: Response) => {
  try {
    const scenarios = await getAllScenarios();
    res.json({ success: true, scenarios, count: scenarios.length });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load scenarios', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/scenarios/:id - Get scenario by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scenario = await getScenarioById(req.params.id);
    if (!scenario) {
      res.status(404).json({ success: false, error: 'Scenario not found' });
      return;
    }
    res.json({ success: true, scenario });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to load scenario', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// POST /api/scenarios - Create a new scenario
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

    const scenarioData = req.body;
    
    // Validate required fields
    if (!scenarioData.title || scenarioData.title.trim().length === 0) {
      res.status(400).json({ 
        success: false, 
        error: 'Scenario title is required' 
      });
      return;
    }

    if (!scenarioData.scenario || !scenarioData.scenario.description) {
      res.status(400).json({ 
        success: false, 
        error: 'Scenario description is required' 
      });
      return;
    }

    const scenario = await documentService.createScenario(scenarioData);
    res.status(201).json({ success: true, scenario });
    
  } catch (error) {
    console.error('Error creating scenario:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Failed to create scenario', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// PUT /api/scenarios/:id - Update an existing scenario
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
        error: 'Cannot change scenario ID' 
      });
      return;
    }

    const scenario = await documentService.updateScenario(id, updates);
    res.json({ success: true, scenario });
    
  } catch (error) {
    console.error('Error updating scenario:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to update scenario', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

// DELETE /api/scenarios/:id - Delete a scenario
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
    
    await documentService.deleteScenario(id);
    res.json({ success: true, message: `Scenario '${id}' deleted successfully` });
    
  } catch (error) {
    console.error('Error deleting scenario:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ 
        success: false, 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete scenario', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
});

export default router;
