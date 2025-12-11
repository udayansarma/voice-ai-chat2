import { Router, Request, Response } from 'express';
import { recognizeSpeech, synthesizeSpeech, synthesizeSpeechStream } from '../services/speechServiceApi';

const router = Router();

// POST /api/speech/recognize - Speech recognition endpoint
router.post('/recognize', async (req: Request, res: Response) => {
  try {
    const { audioData } = req.body;
    console.log('Speech recognition request received, audioData length:', audioData?.length || 'undefined');
    const result = await recognizeSpeech(audioData);
    console.log('Speech recognition successful:', result);
    res.json({ text: result });
  } catch (error) {
    console.error('Speech recognition failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Speech recognition failed',
      details: errorMessage,
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    });
  }
});

// POST /api/speech/synthesize - Text-to-speech endpoint
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, voiceGender, voiceName } = req.body;
    const audioBuffer = await synthesizeSpeech(text, voiceGender, voiceName);
    res.setHeader('Content-Type', 'audio/mp3');
    res.send(audioBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Speech synthesis failed' });
  }
});

// POST /api/speech/synthesize/stream - Streaming TTS endpoint
router.post('/synthesize/stream', async (req: Request, res: Response) => {
  try {
    const { text, voiceGender, voiceName } = req.body;
    await synthesizeSpeechStream(text, voiceGender, res, voiceName);
  } catch (error) {
    res.status(500).json({ error: 'Speech synthesis streaming failed' });
  }
});

export default router;
