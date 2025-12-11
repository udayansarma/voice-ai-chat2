import { Router, Request, Response } from 'express';
import { authConfig } from '../config/env';
import { userService } from '../services/userService';
import { sessionService } from '../services/sessionService';
import { LoginRequest } from '../types/auth';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  if (!authConfig.enabled) {
    res.status(503).json({ error: 'Authentication disabled' });
    return;
  }

  const { username, password } = req.body as LoginRequest;
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  const user = userService.validateUser(username, password);
  
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const session = await sessionService.createSession(user);

  // Set session cookie with SameSite=None in dev to allow cross-site requests
  res.cookie('sessionId', session.sessionId, {
    httpOnly: true,
    secure: true, // ensure Secure flag for cross-site cookies
    maxAge: authConfig.sessionDurationHours * 3600 * 1000,
    // Use SameSite=lax in dev for local cookie acceptance, use None in production for cross-site
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  res.json({ success: true, sessionId: session.sessionId });
  return;
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (sessionId) {
    await sessionService.deleteSession(sessionId as string);
  }
  res.clearCookie('sessionId');
  res.json({ success: true });
  return;
});

// Status endpoint
router.get('/status', async (req: Request, res: Response) => {
  if (!authConfig.enabled) {
    res.json({ authenticated: true });
    return;
  }

  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
  if (!sessionId) {
    res.json({ authenticated: false });
    return;
  }

  const session = await sessionService.validateSession(sessionId as string);
  if (!session) {
    res.json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, username: session.username });
  return;
});

export default router;
