import { Router, Request, Response } from 'express';
import { getChatCompletion } from '../services/chatService';
import type { ChatMessage, ChatRequest, ChatResponse } from '../types/api';
import type { ScenarioParameters } from '../types/api';
import { TemplateManager } from '../prompts/templateManager';

const router = Router();

// POST /api/chat - Chat completion endpoint
router.post('/', async (req: Request<any, any, ChatRequest>, res: Response<ChatResponse>) => {
  try {
    const { messages, parameters }: ChatRequest = req.body;
    const result = await getChatCompletion(messages, undefined, parameters);
    // Ensure content is always a string and include usage data
    res.json({ 
      role: 'assistant',
      content: result.content ?? '',
      usage: result.usage
    });
  } catch (error) {
    res.json({ 
      role: 'assistant', 
      content: 'Sorry, I encountered an error processing your request. Please try again.' 
    });
  }
});

// POST /api/chat/system-prompt - Get substituted system prompt
router.post('/system-prompt', async (req: Request<any, any, { parameters: ScenarioParameters }>, res: Response<{ systemPrompt: string }>) => {
  try {
    const { parameters } = req.body;
    console.log('Received parameters:', parameters);
    
    // Use TemplateManager to get substituted system prompt
    const { systemMessage } = await TemplateManager.getContextualPrompt([], parameters);
    console.log('Generated system message:', systemMessage);
    
    res.json({ systemPrompt: systemMessage });
  } catch (error) {
    console.error('Error in /system-prompt:', error);
    res.status(500).json({ systemPrompt: 'Error generating system prompt.' });
  }
});

export default router;
