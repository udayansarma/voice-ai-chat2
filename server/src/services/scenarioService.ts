import { databaseServiceFactory } from './database-service-factory';
import { FileSyncDatabase } from '../database/file-sync-database';
import { Scenario } from '../types/api';

/**
 * Service for scenario-related operations.
 * Provides methods to fetch all scenarios or a single scenario by ID.
 */
// Note: DB instance must be retrieved at runtime after initialization

export async function getAllScenarios(): Promise<Scenario[]> {
  try {
    // Try DocumentService first
    const documentService = databaseServiceFactory.getDocumentService();
    if (documentService) {
      return await documentService.listScenarios();
    }
    
    // Fallback to database
    const db = databaseServiceFactory.getDatabase();
    if (!(db instanceof FileSyncDatabase)) {
      throw new Error('Database not initialized or not a FileSyncDatabase');
    }
    return db.getAllScenarios();
  } catch (error) {
    console.error('Error getting scenarios:', error);
    throw error;
  }
}

/**
 * Format scenario details for template substitution
 */
export function formatScenarioForTemplate(scenario: Scenario): Record<string, string> {
  if (!scenario) return {};

  console.log('ScenarioService: Formatting scenario for template:', scenario);

  const formatted: Record<string, string> = {
    scenario_id: scenario.id || '',
    scenario_title: scenario.title || '',
    scenario_type: scenario.scenario_type || '',
    difficulty_level: scenario.difficulty_level || '',
  };

  // Format the main scenario description and context
  const scenarioParts = [];
  if (scenario.scenario?.description) {
    scenarioParts.push(`Issue: ${scenario.scenario.description}`);
  }
  
  if (scenario.scenario?.context) {
    const context = scenario.scenario.context;
    const contextParts = [];
    
    if (context.device) contextParts.push(`Device: ${context.device}`);
    if (context.service) contextParts.push(`Service: ${context.service}`);
    if (context.environment) contextParts.push(`Environment: ${context.environment}`);
    
    if (context.prior_actions && context.prior_actions.length > 0) {
      contextParts.push(`Previous attempts: ${context.prior_actions.join(', ')}`);
    }
    
    if (contextParts.length > 0) {
      scenarioParts.push(`Context: ${contextParts.join(' | ')}`);
    }
  }
  
  formatted.scenario_details = scenarioParts.join('\n');

  // Format exit criteria with customer signals
  const exitParts = [];
  if (scenario.exit_criteria?.description) {
    exitParts.push(scenario.exit_criteria.description);
  }
  
  if (scenario.exit_criteria?.customer_exit_signals && scenario.exit_criteria.customer_exit_signals.length > 0) {
    exitParts.push('Customer will signal resolution by:');
    scenario.exit_criteria.customer_exit_signals.forEach(signal => {
      exitParts.push(`• ${signal}`);
    });
  }
  
  formatted.exit_criteria = exitParts.join('\n');

  // Individual components for more granular access
  formatted.scenario_description = scenario.scenario?.description || '';
  formatted.scenario_context = scenario.scenario?.context ? 
    Object.entries(scenario.scenario.context)
      .filter(([key, value]) => value && key !== 'prior_actions')
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') : '';
  
  formatted.prior_actions = scenario.scenario?.context?.prior_actions?.join(', ') || '';
  formatted.customer_exit_signals = scenario.exit_criteria?.customer_exit_signals?.join(', ') || '';

  console.log('ScenarioService: Formatted scenario parameters:', formatted);
  return formatted;
}

export async function getScenarioById(id: string): Promise<Scenario | null> {
  try {
    // Try DocumentService first
    const documentService = databaseServiceFactory.getDocumentService();
    if (documentService) {
      return await documentService.getScenario(id);
    }
    
    // Fallback to database
    const db = databaseServiceFactory.getDatabase();
    if (!(db instanceof FileSyncDatabase)) {
      throw new Error('Database not initialized or not a FileSyncDatabase');
    }
    
    const scenarios = await db.getAllScenarios();
    return scenarios.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Error getting scenario by ID:', error);
    throw error;
  }
}
