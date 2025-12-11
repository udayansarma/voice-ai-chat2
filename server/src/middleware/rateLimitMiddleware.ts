import { Request, Response, NextFunction, RequestHandler } from 'express';
import { authConfig } from '../config/env';
import { sessionStore } from '../storage/sessionStore';
import { UserSession } from '../types/auth';
import { AuthUser } from '../types/auth';

export const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  if (!authConfig.enabled) {
    return next();
  }

  (async () => {
    const session: UserSession | undefined = (req as any).session;
    if (!session) {
      return next(); // Let authMiddleware handle unauthenticated
    }

    console.log(`[RateLimit] Checking user '${session.username}' requests: count=${session.requestCount || 0}`);
    const now = new Date();
    const windowMs = 60 * 1000; // 1 minute
    // Determine per-user rate limit override
    const authUser: AuthUser | undefined = authConfig.users.find(u => u.username === session.username);
    const userLimit = authUser?.rateLimitOverride ?? authConfig.rateLimitPerMinute;

    // Reset count if outside window
    if (now.getTime() - session.lastRequestTime.getTime() > windowMs) {
      session.requestCount = 0;
      session.lastRequestTime = now;
    }

    session.requestCount = (session.requestCount || 0) + 1;
    session.lastRequestTime = now;

    if (session.requestCount > userLimit) {
      console.warn(`[RateLimit] User '${session.username}' exceeded limit: ${session.requestCount}/${userLimit}`);
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    } else {
      console.log(`[RateLimit] User '${session.username}' within limit: ${session.requestCount}/${userLimit}`);
    }

    await sessionStore.set(session.sessionId, session);
    next();
  })().catch(next);
};
