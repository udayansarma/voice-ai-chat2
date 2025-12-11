import { Router } from 'express';
import statsService from '../services/statsService';

const router = Router();

// GET /api/stats - return aggregated usage stats
router.get('/', (_req, res) => {
  const stats = statsService.getStats();
  res.json(stats);
});

// POST /api/stats/speech-duration - record frontend speech duration
router.post('/speech-duration', (req: any, res: any) => {
  const { seconds } = req.body;
  console.log('Received speech duration POST:', seconds);
  if (typeof seconds !== 'number' || seconds < 0) {
    console.log('Invalid seconds value:', seconds);
    return res.status(400).json({ error: 'Invalid seconds value' });
  }
  statsService.recordSpeechDuration(seconds);
  console.log('Updated stats:', statsService.getStats());
  res.status(204).send();
});

// POST /api/stats/reset - reset all stats to zero
router.post('/reset', (_req, res) => {
  statsService.resetStats();
  res.status(204).send();
});

export default router;
