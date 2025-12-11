import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/env';

const router = Router();

// GET / - Retrieve Azure Speech Service token (mounted at /api/speech/token)
router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const speechKey = config.azureSpeechKey;
  const speechRegion = config.azureSpeechRegion;

  if (!speechKey || !speechRegion || speechKey === 'your-azure-speech-key' || speechRegion === 'your-azure-speech-region') {
    res.status(400).json({ error: 'Speech key or region is not configured in the server environment.' });
    return;
  }

  axios.post(
    `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
    null,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )
    .then(tokenResponse => {
      res.json({ token: tokenResponse.data, region: speechRegion });
    })
    .catch(() => {
      res.status(401).json({ error: 'There was an error authorizing your speech key.' });
    });
});

export default router;
