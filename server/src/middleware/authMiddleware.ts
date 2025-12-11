import { Request, Response, NextFunction, RequestHandler } from 'express';
import { authConfig } from '../config/env';
import { sessionStore } from '../storage/sessionStore';

export const authMiddleware: RequestHandler = (req, res, next) => {
  // Always allow these endpoints without authentication
  const publicEndpoints = [
    '/api/health',
    '/api/auth/',
    '/api/speech/token'
  ];
  
  const isPublicEndpoint = publicEndpoints.some(endpoint => req.path.startsWith(endpoint));
  
  if (!authConfig.enabled || isPublicEndpoint) {
    return next();
  }

  const sessionId = (req.cookies as any)?.sessionId || (req.headers['x-session-id'] as string) || (req.headers['x-session-id'.toLowerCase()] as string);
  if (!sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  (async () => {
    try {
      const session = await sessionStore.get(sessionId as string);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      // Rolling expiration
      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const expiresAt = new Date(lastActivity);
      expiresAt.setHours(expiresAt.getHours() + authConfig.sessionDurationHours);
      if (now > expiresAt) {
        await sessionStore.delete(session.sessionId);
        res.status(401).json({ error: 'Session expired' });
        return;
      }

      session.lastActivity = now;
      session.expiresAt = expiresAt;
      await sessionStore.set(session.sessionId, session);

      // Attach session to request
      (req as any).session = session;
      console.log(`[Auth] User '${session.username}' session '${session.sessionId}' validated at ${now.toISOString()}`);
      next();
    } catch (error) {
      next(error);
    }
  })();
};
